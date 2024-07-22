/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient, Logger } from '@kbn/core/server';
import { NewestIndex } from '@kbn/logs-optimization-plugin/common/types';
import { IDetectionsClient } from '../detections/types';
import { IRecommendationsClient } from './types';

interface RecommendationsClientDeps {
  logger: Logger;
  esClient: ElasticsearchClient;
  detectionsClient: IDetectionsClient;
}

export class RecommendationsClient implements IRecommendationsClient {
  // private recommendationsByDatasetMap = new Map();

  private constructor(
    private readonly logger: Logger,
    private readonly esClient: ElasticsearchClient,
    private readonly detectionsClient: IDetectionsClient
  ) {}

  async getRecommendations({ dataset }) {
    const newestIndex = await this.getNewestIndex(dataset);

    if (newestIndex) {
      return {
        detections: await this.detectionsClient.detectFrom(newestIndex),
      };
    }

    return { detections: [] };
  }

  // generateRecommendationsByDataset({ dataset }) {}

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
