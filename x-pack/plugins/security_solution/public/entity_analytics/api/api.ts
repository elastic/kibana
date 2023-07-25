/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RISK_SCORE_PREVIEW_URL } from '../../../common/constants';

import { KibanaServices } from '../../common/lib/kibana';
import type { GetScoresResponse } from '../../../server/lib/risk_engine/types';
import type { RiskScorePreviewRequestSchema } from '../../../common/risk_engine/risk_score_preview/request_schema';

/**
 * Fetches preview risks scores
 */
export const fetchRiskScorePreview = async ({
  signal,
  params,
}: {
  signal?: AbortSignal;
  params: RiskScorePreviewRequestSchema;
}): Promise<GetScoresResponse> => {
  return KibanaServices.get().http.fetch<GetScoresResponse>(RISK_SCORE_PREVIEW_URL, {
    method: 'POST',
    body: JSON.stringify(params),
    signal,
  });
};
