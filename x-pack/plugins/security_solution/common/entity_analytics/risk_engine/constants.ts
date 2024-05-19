/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { INTERNAL_RISK_SCORE_URL } from '../risk_score/constants';
export const RISK_ENGINE_URL = `${INTERNAL_RISK_SCORE_URL}/engine`;
export const RISK_ENGINE_STATUS_URL = `${RISK_ENGINE_URL}/status`;
export const RISK_ENGINE_INIT_URL = `${RISK_ENGINE_URL}/init`;
export const RISK_ENGINE_ENABLE_URL = `${RISK_ENGINE_URL}/enable`;
export const RISK_ENGINE_DISABLE_URL = `${RISK_ENGINE_URL}/disable`;
export const RISK_ENGINE_PRIVILEGES_URL = `${RISK_ENGINE_URL}/privileges`;
export const RISK_ENGINE_SETTINGS_URL = `${RISK_ENGINE_URL}/settings`;

export const MAX_SPACES_COUNT = 1;

type ClusterPrivilege = 'manage_index_templates' | 'manage_transform';
export const RISK_ENGINE_REQUIRED_ES_CLUSTER_PRIVILEGES = [
  'manage_index_templates',
  'manage_transform',
] as ClusterPrivilege[];

export const RISK_SCORE_INDEX_PATTERN = 'risk-score.risk-score-*';

export type RiskEngineIndexPrivilege = 'read' | 'write';

export const RISK_ENGINE_REQUIRED_ES_INDEX_PRIVILEGES = Object.freeze({
  [RISK_SCORE_INDEX_PATTERN]: ['read', 'write'] as RiskEngineIndexPrivilege[],
});
