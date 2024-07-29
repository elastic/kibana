/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient, Logger } from '@kbn/core/server';
import { createRecommendation } from '../../../common/recommendations/utils';
import { Recommendation } from '../../../common/recommendations';
import { IDetectionsClient } from '../detections/types';
import { IRecommendationsClient } from './types';
import { IndexManagerCreator } from '../../lib/index_manager';

interface RecommendationsClientDeps {
  logger: Logger;
  esClient: ElasticsearchClient;
  detectionsClient: IDetectionsClient;
  indexManagerCreator: IndexManagerCreator;
}

export class RecommendationsClient implements IRecommendationsClient {
  private constructor(
    private readonly logger: Logger,
    private readonly esClient: ElasticsearchClient,
    private readonly detectionsClient: IDetectionsClient,
    private readonly indexManagerCreator: IndexManagerCreator
  ) {}

  async getRecommendations({ dataStream }: { dataStream: string }): Promise<Recommendation[]> {
    const indexManager = this.indexManagerCreator.fromIndexPattern(dataStream);

    const lastIndex = await indexManager.getNewestDataStreamIndex();

    if (!lastIndex) {
      return [];
    }

    const detections = await this.detectionsClient.detectFrom(lastIndex);

    const recommendations = detections.map(createRecommendation);

    return recommendations;
  }

  // applyRecommendation({ dataStream, recommendationId }) {}

  // private async getNewestIndex(dataStream: string): Promise<NewestIndex | null> {
  //   const datasetIndices = await this.esClient.indices.get({ index: dataStream });

  //   const newestIndexName = Object.keys(datasetIndices).sort().pop();

  //   if (!newestIndexName) {
  //     return null;
  //   }

  //   return {
  //     name: newestIndexName,
  //     ...datasetIndices[newestIndexName],
  //   };
  // }

  public static create({
    logger,
    esClient,
    detectionsClient,
    indexManagerCreator,
  }: RecommendationsClientDeps) {
    return new RecommendationsClient(logger, esClient, detectionsClient, indexManagerCreator);
  }
}
