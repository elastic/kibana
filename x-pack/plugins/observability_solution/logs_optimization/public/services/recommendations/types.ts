/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HttpStart } from '@kbn/core/public';
import {
  ApplyRecommendationRequestPayload,
  ApplyRecommendationResponsePayload,
  GetRecommendationsRequestQuery,
  GetRecommendationsResponsePayload,
} from '../../../common/latest';
import type { RecommendationsClient } from './recommendations_client';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface RecommendationsServiceSetup {}

export interface RecommendationsServiceStart {
  getClient: () => Promise<RecommendationsClient>;
}

export interface RecommendationsServiceStartDeps {
  http: HttpStart;
}

export interface IRecommendationsClient {
  find(params: GetRecommendationsRequestQuery): Promise<GetRecommendationsResponsePayload>;
  applyOne(
    recommendationId: string,
    payload: ApplyRecommendationRequestPayload
  ): Promise<ApplyRecommendationResponsePayload>;
  simulatePipeline(params: any): Promise<GetRecommendationsResponsePayload>;
}
