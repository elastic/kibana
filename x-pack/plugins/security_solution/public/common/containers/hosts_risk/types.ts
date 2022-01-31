/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const enum HostRiskScoreQueryId {
  DEFAULT = 'HostRiskScore',
  HOST_RISK_SCORE_OVER_TIME = 'HostRiskScoreOverTimeQuery',
  TOP_HOST_SCORE_CONTRIBUTORS = 'TopHostScoreContributorsQuery',
  OVERVIEW_RISKY_HOSTS = 'OverviewRiskyHosts',
}
