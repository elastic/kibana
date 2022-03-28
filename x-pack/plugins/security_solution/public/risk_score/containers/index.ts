/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HostsRiskScore } from '../../../common/search_strategy/security_solution/risk_score';

export * from './all';
export * from './kpi';

export const enum UserRiskScoreQueryId {
  USERS_BY_RISK = 'UsersByRisk',
}

export const enum HostRiskScoreQueryId {
  DEFAULT = 'HostRiskScore',
  HOST_RISK_SCORE_OVER_TIME = 'HostRiskScoreOverTimeQuery',
  TOP_HOST_SCORE_CONTRIBUTORS = 'TopHostScoreContributorsQuery',
  OVERVIEW_RISKY_HOSTS = 'OverviewRiskyHosts',
  HOSTS_BY_RISK = 'HostsByRisk',
}

export interface HostRisk {
  loading: boolean;
  isModuleEnabled?: boolean;
  result?: HostsRiskScore[];
}
