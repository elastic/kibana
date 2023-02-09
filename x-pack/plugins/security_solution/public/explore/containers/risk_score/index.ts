/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  HostRiskScore,
  UserRiskScore,
} from '../../../../common/search_strategy/security_solution/risk_score';

export * from './all';
export * from './kpi';

export enum UserRiskScoreQueryId {
  USERS_BY_RISK = 'UsersByRisk',
  USER_DETAILS_RISK_SCORE = 'UserDetailsRiskScore',
}

export enum HostRiskScoreQueryId {
  DEFAULT = 'HostRiskScore',
  HOST_DETAILS_RISK_SCORE = 'HostDetailsRiskScore',
  OVERVIEW_RISKY_HOSTS = 'OverviewRiskyHosts',
  HOSTS_BY_RISK = 'HostsByRisk',
}

export interface HostRisk {
  loading: boolean;
  isModuleEnabled: boolean;
  result?: HostRiskScore[];
}

export interface UserRisk {
  loading: boolean;
  isModuleEnabled: boolean;
  result?: UserRiskScore[];
}
