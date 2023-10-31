/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface RiskEngineMetrics {
  unique_host_risk_score_total?: number;
  unique_user_risk_score_total?: number;
  unique_user_risk_score_day?: number;
  unique_host_risk_score_day?: number;
  all_user_risk_scores_total?: number;
  all_host_risk_scores_total?: number;
  all_user_risk_scores_total_day?: number;
  all_host_risk_scores_total_day?: number;
  all_risk_scores_index_size?: number;
  unique_risk_scores_index_size?: number;
}
