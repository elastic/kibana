/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient, Logger } from '@kbn/core/server';
import { NewestIndex } from '../../../common/types';
import { createRecommendation } from '../../../common/recommendations/utils';
import { Recommendation } from '../../../common/recommendations';
import { IDetectionsClient } from '../detections/types';
import { IRecommendationsClient } from './types';

interface RecommendationsClientDeps {
  logger: Logger;
  esClient: ElasticsearchClient;
  detectionsClient: IDetectionsClient;
}

export class RecommendationsClient implements IRecommendationsClient {
  private constructor(
    private readonly logger: Logger,
    private readonly esClient: ElasticsearchClient,
    private readonly detectionsClient: IDetectionsClient
  ) {}

  async getRecommendations({ dataset }: { dataset: string }): Promise<Recommendation[]> {
    const newestIndex = await this.getNewestIndex(dataset);

    if (!newestIndex) {
      return [];
    }

    const detections = await this.detectionsClient.detectFrom(newestIndex);

    const recommendations = detections.map(createRecommendation);

    return recommendations;
  }

  // applyRecommendation({ dataset, recommendationId }) {}

  private async getNewestIndex(dataset: string): Promise<NewestIndex | null> {
    const datasetIndices = await this.esClient.indices.get({ index: dataset });

    const newestIndexName = Object.keys(datasetIndices).sort().pop();

    if (!newestIndexName) {
      return null;
    }

    return {
      name: newestIndexName,
      ...datasetIndices[newestIndexName],
    };
  }

  public static create({ logger, esClient, detectionsClient }: RecommendationsClientDeps) {
    return new RecommendationsClient(logger, esClient, detectionsClient);
  }
}
