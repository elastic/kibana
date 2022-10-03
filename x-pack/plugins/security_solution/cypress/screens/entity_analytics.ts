/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const DEFAULT_ALERTS_INDEX = '.alerts-security.alerts' as const;

export const enum RiskScoreEntity {
  host = 'host',
  user = 'user',
}

const HOST_RISK_SCORE = 'Host Risk Score';
const USER_RISK_SCORE = 'User Risk Score';

const getRiskScore = (riskScoreEntity: RiskScoreEntity) =>
  riskScoreEntity === RiskScoreEntity.user ? USER_RISK_SCORE : HOST_RISK_SCORE;

export const getRiskScoreTagName = (riskScoreEntity: RiskScoreEntity, spaceId = 'default') =>
  `${getRiskScore(riskScoreEntity)} ${spaceId}`;

/**
 * * Since 8.5, all the transforms, scripts,
 * and ingest pipelines (and dashboard saved objects) are created with spaceId
 * so they won't affect each other across different spaces.
 */
export const getRiskScorePivotTransformId = (
  riskScoreEntity: RiskScoreEntity,
  spaceId = 'default'
) => `ml_${riskScoreEntity}riskscore_pivot_transform_${spaceId}`;

export const getRiskScoreLatestTransformId = (
  riskScoreEntity: RiskScoreEntity,
  spaceId = 'default'
) => `ml_${riskScoreEntity}riskscore_latest_transform_${spaceId}`;

export const getIngestPipelineName = (riskScoreEntity: RiskScoreEntity, spaceId = 'default') =>
  `ml_${riskScoreEntity}riskscore_ingest_pipeline_${spaceId}`;

export const getPivotTransformIndex = (riskScoreEntity: RiskScoreEntity, spaceId = 'default') =>
  `ml_${riskScoreEntity}_risk_score_${spaceId}`;

export const getLatestTransformIndex = (riskScoreEntity: RiskScoreEntity, spaceId = 'default') =>
  `ml_${riskScoreEntity}_risk_score_latest_${spaceId}`;

export const getAlertsIndex = (spaceId = 'default') => `${DEFAULT_ALERTS_INDEX}-${spaceId}`;

export const getRiskScoreLevelScriptId = (riskScoreEntity: RiskScoreEntity, spaceId = 'default') =>
  `ml_${riskScoreEntity}riskscore_levels_script_${spaceId}`;
export const getRiskScoreInitScriptId = (riskScoreEntity: RiskScoreEntity, spaceId = 'default') =>
  `ml_${riskScoreEntity}riskscore_init_script_${spaceId}`;
export const getRiskScoreMapScriptId = (riskScoreEntity: RiskScoreEntity, spaceId = 'default') =>
  `ml_${riskScoreEntity}riskscore_map_script_${spaceId}`;
export const getRiskScoreReduceScriptId = (riskScoreEntity: RiskScoreEntity, spaceId = 'default') =>
  `ml_${riskScoreEntity}riskscore_reduce_script_${spaceId}`;

/**
 * These scripts and Ingest pipeline were not space awared before 8.5.
 * They were shared across spaces and therefore affected each other.
 * New scripts and ingest pipeline are all independent in each space, so these ids
 * are Deprecated.
 * But We still need to keep track of the old ids, so we can delete them during upgrade.
 */
export const getLegacyIngestPipelineName = (riskScoreEntity: RiskScoreEntity) =>
  `ml_${riskScoreEntity}riskscore_ingest_pipeline`;
export const getLegacyRiskScoreLevelScriptId = (riskScoreEntity: RiskScoreEntity) =>
  `ml_${riskScoreEntity}riskscore_levels_script`;
export const getLegacyRiskScoreInitScriptId = (riskScoreEntity: RiskScoreEntity) =>
  `ml_${riskScoreEntity}riskscore_init_script`;
export const getLegacyRiskScoreMapScriptId = (riskScoreEntity: RiskScoreEntity) =>
  `ml_${riskScoreEntity}riskscore_map_script`;
export const getLegacyRiskScoreReduceScriptId = (riskScoreEntity: RiskScoreEntity) =>
  `ml_${riskScoreEntity}riskscore_reduce_script`;

export const ENABLE_HOST_RISK_SCORE_BUTTON = '[data-test-subj="enable_host_risk_score"]';

export const UPGRADE_HOST_RISK_SCORE_BUTTON = '[data-test-subj="host-risk-score-upgrade"]';

export const UPGRADE_USER_RISK_SCORE_BUTTON = '[data-test-subj="user-risk-score-upgrade"]';

export const HOST_RISK_SCORE_NO_DATA_DETECTED =
  '[data-test-subj="host-risk-score-no-data-detected"]';

export const USER_RISK_SCORE_NO_DATA_DETECTED =
  '[data-test-subj="user-risk-score-no-data-detected"]';

export const RISK_SCORE_DASHBOARDS_INSTALLATION_SUCCESS_TOAST = (
  riskScoreEntity: RiskScoreEntity
) => `[data-test-subj="${riskScoreEntity}RiskScoreDashboardsSuccessToast"]`;

export const RISK_SCORE_INSTALLATION_SUCCESS_TOAST = (riskScoreEntity: RiskScoreEntity) =>
  `[data-test-subj="${riskScoreEntity}EnableSuccessToast"]`;

export const HOSTS_DONUT_CHART =
  '[data-test-subj="entity_analytics_hosts"] [data-test-subj="donut-chart"]';

export const HOSTS_TABLE = '[data-test-subj="entity_analytics_hosts"] #hostRiskDashboardTable';

export const HOSTS_TABLE_ROWS = '[data-test-subj="entity_analytics_hosts"] .euiTableRow';

export const USERS_DONUT_CHART =
  '[data-test-subj="entity_analytics_users"] [data-test-subj="donut-chart"]';

export const USERS_TABLE_ROWS = '[data-test-subj="entity_analytics_users"] .euiTableRow';

export const USERS_TABLE = '[data-test-subj="entity_analytics_users"] #userRiskDashboardTable';

export const ENABLE_USER_RISK_SCORE_BUTTON = '[data-test-subj="enable_user_risk_score"]';

export const ANOMALIES_TABLE =
  '[data-test-subj="entity_analytics_anomalies"] #entityAnalyticsDashboardAnomaliesTable';

export const ANOMALIES_TABLE_ROWS = '[data-test-subj="entity_analytics_anomalies"] .euiTableRow';

export const UPGRADE_CONFIRMARION_MODAL = (riskScoreEntity: RiskScoreEntity) =>
  `[data-test-subj="${riskScoreEntity}-risk-score-upgrade-confirmation-modal"]`;

export const UPGRADE_CONFIRMATION_BUTTON = '[data-test-subj="confirmModalConfirmButton"]';

export const UPGRADE_CANCELLATION_BUTTON = '[data-test-subj="confirmModalCancelButton"]';
