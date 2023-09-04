/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  RISK_ENGINE_STATUS_URL,
  RISK_SCORE_PREVIEW_URL,
  RISK_ENGINE_ENABLE_URL,
  RISK_ENGINE_DISABLE_URL,
  RISK_ENGINE_INIT_URL,
} from '../../../common/constants';

import { KibanaServices } from '../../common/lib/kibana';
import type {
  CalculateScoresResponse,
  EnableRiskEngineResponse,
  GetRiskEngineStatusResponse,
  InitRiskEngineResponse,
  DisableRiskEngineResponse,
} from '../../../server/lib/risk_engine/types';
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
}): Promise<CalculateScoresResponse> => {
  return KibanaServices.get().http.fetch<CalculateScoresResponse>(RISK_SCORE_PREVIEW_URL, {
    method: 'POST',
    body: JSON.stringify(params),
    signal,
  });
};

/**
 * Fetches risks engine status
 */
export const fetchRiskEngineStatus = async ({
  signal,
}: {
  signal?: AbortSignal;
}): Promise<GetRiskEngineStatusResponse> => {
  return KibanaServices.get().http.fetch<GetRiskEngineStatusResponse>(RISK_ENGINE_STATUS_URL, {
    method: 'GET',
    signal,
  });
};

/**
 * Init risk score engine
 */
export const initRiskEngine = async (): Promise<InitRiskEngineResponse> => {
  return KibanaServices.get().http.fetch<InitRiskEngineResponse>(RISK_ENGINE_INIT_URL, {
    method: 'POST',
  });
};

/**
 * Enable risk score engine
 */
export const enableRiskEngine = async (): Promise<EnableRiskEngineResponse> => {
  return KibanaServices.get().http.fetch<EnableRiskEngineResponse>(RISK_ENGINE_ENABLE_URL, {
    method: 'POST',
  });
};

/**
 * Disable risk score engine
 */
export const disableRiskEngine = async (): Promise<DisableRiskEngineResponse> => {
  return KibanaServices.get().http.fetch<DisableRiskEngineResponse>(RISK_ENGINE_DISABLE_URL, {
    method: 'POST',
  });
};
