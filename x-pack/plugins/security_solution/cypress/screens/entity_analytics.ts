/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RiskScoreEntity } from '../tasks/risk_scores/common';

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

export const UPGRADE_CONFIRMATION_MODAL = (riskScoreEntity: RiskScoreEntity) =>
  `[data-test-subj="${riskScoreEntity}-risk-score-upgrade-confirmation-modal"]`;

export const UPGRADE_CONFIRMATION_BUTTON = '[data-test-subj="confirmModalConfirmButton"]';

export const UPGRADE_CANCELLATION_BUTTON = '[data-test-subj="confirmModalCancelButton"]';

export const USERS_TABLE_ALERT_CELL =
  '[data-test-subj="entity_analytics_users"] [data-test-subj="risk-score-alerts"]';

export const HOSTS_TABLE_ALERT_CELL =
  '[data-test-subj="entity_analytics_hosts"] [data-test-subj="risk-score-alerts"]';
