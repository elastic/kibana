/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup, ElasticsearchClient, KibanaRequest } from '@kbn/core/server';
import { Tasks } from '../../../common/detections/types';
import { Recommendation } from '../../../common/recommendations';
import { IndexManagerCreator } from '../../lib/index_manager';
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
    detectionClient: IDetectionsClient,
    indexManagerCreator: IndexManagerCreator
  ): RecommendationsClient;
  getScopedClient(request: KibanaRequest): Promise<RecommendationsClient>;
}

export interface IRecommendationsClient {
  getRecommendations({ dataStream }: { dataStream: string }): Promise<Recommendation[]>;
  applyRecommendation({
    id,
    dataStream,
    tasks,
  }: {
    id: string;
    dataStream: string;
    tasks: Tasks;
  }): Promise<Recommendation>;
}
