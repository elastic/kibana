/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient, Logger } from '@kbn/core/server';
import deepmerge from 'deepmerge';
import { Tasks } from '../../../common/detections/types';
import { createRecommendation } from '../../../common/recommendations/utils';
import { Recommendation } from '../../../common/recommendations';
import { IDetectionsClient } from '../detections/types';
import { IRecommendationsClient } from './types';
import { IndexManagerCreator } from '../../lib/index_manager';
import { RecommendationNotFoundError, RecommendationResolvedError } from './errors';

interface RecommendationsClientDeps {
  logger: Logger;
  esClient: ElasticsearchClient;
  detectionsClient: IDetectionsClient;
  indexManagerCreator: IndexManagerCreator;
}

// THIS IS ONLY DONE TO SIMULATE A DATA STORAGE
const recommendationsByDataStreamMap: Map<string, Recommendation[]> = new Map();

export class RecommendationsClient implements IRecommendationsClient {
  private constructor(
    private readonly logger: Logger,
    private readonly esClient: ElasticsearchClient,
    private readonly detectionsClient: IDetectionsClient,
    private readonly indexManagerCreator: IndexManagerCreator
  ) {}

  async getRecommendations({ dataStream }: { dataStream: string }): Promise<Recommendation[]> {
    // This should be a SO lookup once recommendations are persisted.
    const storedRecommendation = recommendationsByDataStreamMap.get(dataStream);
    if (storedRecommendation) {
      return storedRecommendation;
    }

    const indexManager = this.indexManagerCreator.fromIndexPattern(dataStream);

    const lastIndex = await indexManager.getNewestDataStreamIndex();

    if (!lastIndex) {
      return [];
    }

    const detections = await this.detectionsClient.detectFrom(lastIndex);

    const recommendations = detections.map((detection) =>
      createRecommendation({ dataStream, detection })
    );

    recommendationsByDataStreamMap.set(dataStream, recommendations);

    return recommendations;
  }

  async applyRecommendation({
    id,
    dataStream,
    tasks,
  }: {
    id: string;
    dataStream: string;
    tasks: Tasks;
  }) {
    // This should be a SO lookup once recommendations are persisted.
    const storedRecommendations = recommendationsByDataStreamMap.get(dataStream);
    const recommendation = storedRecommendations?.find(
      (currRecommendation) => currRecommendation.id === id
    );

    if (!storedRecommendations || !recommendation) {
      throw new RecommendationNotFoundError(
        'There is no recommendation for the specified data stream or id.'
      );
    }

    if (recommendation.status === 'resolved') {
      throw new RecommendationResolvedError('This recommendations has already been applied.');
    }

    const indexManager = this.indexManagerCreator.fromIndexPattern(dataStream);

    const newestIndex = await indexManager.getNewestDataStreamIndex();

    if (newestIndex && newestIndex.info.isManagedByFleet) {
      // 1. Create/update the custom pipeline for the integration data stream
      if (tasks.processors && newestIndex.info.template) {
        const customPipelineDraft = {
          processors: tasks.processors,
        };
        await indexManager.updateIndexPipeline(
          `${newestIndex.info.template}@custom`,
          customPipelineDraft
        );
      }
    } else if (newestIndex && newestIndex.info.isManaged) {
      // 1. Get if an ad-hoc index template is in place or relies on default one
      const customTemplateName = indexManager.getCustomIndexTemplateName();
      const defaultPipelineName = indexManager.getDefaultPipelineName();
      const dataStreamWildcard = indexManager.getDataStreamWildcard();

      const customTemplate = await indexManager.getIndexTemplate(customTemplateName);

      if (customTemplate) {
        // A custom template has been already created, update only mappings and pipeline
        if (tasks.processors) {
          const previousDefaultPipelineProcessor =
            newestIndex.settings?.index?.default_pipeline !== defaultPipelineName
              ? {
                  pipeline: {
                    name: newestIndex.settings?.index?.default_pipeline,
                  },
                }
              : null;

          const customPipelineDraft = {
            processors: [previousDefaultPipelineProcessor, ...tasks.processors].filter(Boolean),
          };
          await indexManager.updateIndexPipeline(defaultPipelineName, customPipelineDraft);
        }
      } else {
        if (newestIndex.info.template) {
          // 2. Duplicate index template, updating default pipeline with <template-name>
          const defaultTemplate = await indexManager.getIndexTemplate(newestIndex.info.template);

          const customTemplateDraft = deepmerge(
            defaultTemplate ?? {},
            {
              index_patterns: [dataStreamWildcard],
              priority: 200,
              _meta: {
                description: `Ad-hoc template installed for ${dataStreamWildcard} data streams.`,
              },
              template: {
                settings: {
                  index: {
                    default_pipeline: defaultPipelineName,
                  },
                },
              },
            },
            { arrayMerge: (_destination, source) => source }
          );

          await indexManager.updateIndexTemplate(customTemplateName, customTemplateDraft);
        }

        if (tasks.processors) {
          const previousDefaultPipelineProcessor =
            newestIndex.settings?.index?.default_pipeline !== defaultPipelineName
              ? {
                  pipeline: {
                    name: newestIndex.settings?.index?.default_pipeline,
                  },
                }
              : null;

          const customPipelineDraft = {
            processors: [previousDefaultPipelineProcessor, ...tasks.processors].filter(Boolean),
          };
          await indexManager.updateIndexPipeline(defaultPipelineName, customPipelineDraft);
        }
      }
    } else {
      // Do something for non data stream indices
    }

    const updatedRecommendation: Recommendation = {
      ...recommendation,
      detection: {
        ...recommendation.detection,
        tasks,
      },
      updated_at: new Date().toISOString(),
      status: 'resolved',
    };

    const updatedRecommendations = storedRecommendations
      .map((storedRecommendation) =>
        storedRecommendation.id === updatedRecommendation.id
          ? updatedRecommendation
          : storedRecommendation
      )
      .sort(sortByStatus);

    recommendationsByDataStreamMap.set(dataStream, updatedRecommendations);

    return updatedRecommendation;
  }

  public static create({
    logger,
    esClient,
    detectionsClient,
    indexManagerCreator,
  }: RecommendationsClientDeps) {
    return new RecommendationsClient(logger, esClient, detectionsClient, indexManagerCreator);
  }
}

const sortByStatus = (curr: Recommendation, next: Recommendation) => {
  if (curr.status === 'resolved' && next.status !== 'resolved') {
    return -1;
  } else if (curr.status !== 'resolved' && next.status === 'resolved') {
    return 1;
  } else if (curr.status === 'resolved' && next.status === 'resolved') {
    return 0;
  } else {
    return curr.updated_at.localeCompare(next.updated_at);
  }
};
