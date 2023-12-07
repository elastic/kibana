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
  RISK_ENGINE_PRIVILEGES_URL,
  ASSET_CRITICALITY_PRIVILEGES_URL,
} from '../../../common/constants';

import { KibanaServices } from '../../common/lib/kibana';
import type {
  CalculateScoresResponse,
  EnableRiskEngineResponse,
  GetRiskEngineStatusResponse,
  InitRiskEngineResponse,
  DisableRiskEngineResponse,
} from '../../../server/lib/entity_analytics/types';
import type { RiskScorePreviewRequestSchema } from '../../../common/risk_engine/risk_score_preview/request_schema';
import type { EntityAnalyticsPrivileges } from '../../../common/api/entity_analytics/common';

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
    version: '1',
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
    version: '1',
    method: 'GET',
    signal,
  });
};

/**
 * Init risk score engine
 */
export const initRiskEngine = async (): Promise<InitRiskEngineResponse> => {
  return KibanaServices.get().http.fetch<InitRiskEngineResponse>(RISK_ENGINE_INIT_URL, {
    version: '1',
    method: 'POST',
  });
};

/**
 * Enable risk score engine
 */
export const enableRiskEngine = async (): Promise<EnableRiskEngineResponse> => {
  return KibanaServices.get().http.fetch<EnableRiskEngineResponse>(RISK_ENGINE_ENABLE_URL, {
    version: '1',
    method: 'POST',
  });
};

/**
 * Disable risk score engine
 */
export const disableRiskEngine = async (): Promise<DisableRiskEngineResponse> => {
  return KibanaServices.get().http.fetch<DisableRiskEngineResponse>(RISK_ENGINE_DISABLE_URL, {
    version: '1',
    method: 'POST',
  });
};

/**
 * Get risk engine privileges
 */
export const fetchRiskEnginePrivileges = async (): Promise<EntityAnalyticsPrivileges> => {
  return KibanaServices.get().http.fetch<EntityAnalyticsPrivileges>(RISK_ENGINE_PRIVILEGES_URL, {
    version: '1',
    method: 'GET',
  });
};

/**
 * Get asset criticality privileges
 */
export const fetchAssetCriticalityPrivileges = async (): Promise<EntityAnalyticsPrivileges> => {
  return KibanaServices.get().http.fetch<EntityAnalyticsPrivileges>(
    ASSET_CRITICALITY_PRIVILEGES_URL,
    {
      version: '1',
      method: 'GET',
    }
  );
};
