/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IndicesIndexState } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { CoreSetup, ElasticsearchClient, KibanaRequest } from '@kbn/core/server';
import { DetectionsServiceStart } from '../detections';
import { IDetectionsClient } from '../detections/types';

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
  ): IRecommendationsClient;
  getScopedClient(request: KibanaRequest): Promise<IRecommendationsClient>;
}

export interface IRecommendationsClient {
  getRecommendations({ dataset }: { dataset: string }): unknown[]; // TODO: update types
}
