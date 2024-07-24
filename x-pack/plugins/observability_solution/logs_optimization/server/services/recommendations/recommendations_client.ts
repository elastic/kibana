/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { v4 as uuidv4 } from 'uuid';
import { ElasticsearchClient, Logger } from '@kbn/core/server';
import {
  Detection,
  FieldExtractionDetection,
  MappingGapsDetection,
} from '@kbn/logs-optimization-plugin/common/detections/types';
import { NewestIndex } from '@kbn/logs-optimization-plugin/common/types';
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

  async getRecommendations({ dataset }) {
    const newestIndex = await this.getNewestIndex(dataset);

    if (!newestIndex) {
      return { recommendations: [] };
    }

    const detections = await this.detectionsClient.detectFrom(newestIndex);

    const recommendations = detections.map(createRecommendationFromDetection);

    return {
      recommendations,
    };
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

const createRecommendationFromDetection = (detection: Detection) => {
  return {
    id: uuidv4(),
    created_at: new Date().toISOString(),
    status: 'pending',
    detection,
  };
};
