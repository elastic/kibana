/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RISKY_HOSTS_INDEX_PREFIX, RISKY_USERS_INDEX_PREFIX } from '../../../../constants';

export const getHostRiskIndex = (spaceId: string, onlyLatest: boolean = true): string => {
  return `${RISKY_HOSTS_INDEX_PREFIX}${onlyLatest ? 'latest_' : ''}${spaceId}`;
};

export const getUserRiskIndex = (spaceId: string, onlyLatest: boolean = true): string => {
  return `${RISKY_USERS_INDEX_PREFIX}${onlyLatest ? 'latest_' : ''}${spaceId}`;
};

export const buildHostNamesFilter = (hostNames: string[]) => {
  return { terms: { 'host.name': hostNames } };
};

export const buildUserNamesFilter = (userNames: string[]) => {
  return { terms: { 'user.name': userNames } };
};

export enum RiskQueries {
  riskScore = 'riskScore',
  kpiRiskScore = 'kpiRiskScore',
}

export type RiskScoreAggByFields = 'host.name' | 'user.name';
