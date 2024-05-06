/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
export const MAX_SPACES_COUNT = 1;

type ClusterPrivilege = 'manage_index_templates' | 'manage_transform';
export const RISK_ENGINE_REQUIRED_ES_CLUSTER_PRIVILEGES = [
  'manage_index_templates',
  'manage_transform',
] as ClusterPrivilege[];

export const RISK_SCORE_INDEX_PATTERN = 'risk-score.risk-score-*';

type RiskEngineIndexPrivilege = 'read' | 'write';
export const RISK_ENGINE_REQUIRED_ES_INDEX_PRIVILEGES = Object.freeze({
  [RISK_SCORE_INDEX_PATTERN]: ['read', 'write'] as RiskEngineIndexPrivilege[],
});
