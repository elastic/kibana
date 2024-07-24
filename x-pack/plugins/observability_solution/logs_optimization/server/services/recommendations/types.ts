/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup, ElasticsearchClient, KibanaRequest } from '@kbn/core/server';
import { Recommendation } from '@kbn/logs-optimization-plugin/common/recommendations';
import { DetectionsServiceStart } from '../detections';
import { IDetectionsClient } from '../detections/types';
import type { RecommendationsClient } from './recommendations_client';

export interface RecommendationsServiceSetupDeps {
  getStartServices: CoreSetup['getStartServices'];
}

export interface RecommendationsServiceStartDeps {
  detectionsService: DetectionsServiceStart;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface RecommendationsServiceSetup {}

export interface RecommendationsServiceStart {
  getClient(
    esClient: ElasticsearchClient,
    detectionClient: IDetectionsClient
  ): RecommendationsClient;
  getScopedClient(request: KibanaRequest): Promise<RecommendationsClient>;
}

export interface IRecommendationsClient {
  getRecommendations({ dataset }: { dataset: string }): Promise<Recommendation[]>;
}
