/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface RiskEngineMetrics {
  unique_host_risk_score_total?: string;
  unique_user_risk_score_total?: string;
  unique_user_risk_score_day?: string;
  unique_host_risk_score_day?: string;
  all_user_risk_scores_total?: string;
  all_host_risk_scores_total?: string;
  all_user_risk_scores_total_day?: string;
  all_host_risk_scores_total_day?: string;
  all_risk_scores_index_size?: string;
  unique_risk_scores_index_size?: string;
}
