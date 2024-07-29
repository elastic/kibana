/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient, Logger } from '@kbn/core/server';
import { Tasks } from '../../../common/detections/types';
import { createRecommendation } from '../../../common/recommendations/utils';
import { Recommendation } from '../../../common/recommendations';
import { IDetectionsClient } from '../detections/types';
import { IRecommendationsClient } from './types';
import { IndexManagerCreator } from '../../lib/index_manager';
import { RecommendationNotFoundError } from './errors';

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

    // TODO: apply recommendation tasks

    const updatedRecommendation: Recommendation = {
      ...recommendation,
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
