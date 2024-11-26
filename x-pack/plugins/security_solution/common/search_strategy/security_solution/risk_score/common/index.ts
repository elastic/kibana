/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ESQuery } from '../../../../typed_json';
import {
  RiskScoreEntity,
  getRiskScoreLatestIndex,
  getRiskScoreTimeSeriesIndex,
} from '../../../../entity_analytics/risk_engine';
export { RiskQueries } from '../../../../api/search_strategy';

export const getHostRiskIndex = (spaceId: string, onlyLatest: boolean = true): string => {
  return onlyLatest ? getRiskScoreLatestIndex(spaceId) : getRiskScoreTimeSeriesIndex(spaceId);
};

export const getUserRiskIndex = (spaceId: string, onlyLatest: boolean = true): string => {
  return onlyLatest ? getRiskScoreLatestIndex(spaceId) : getRiskScoreTimeSeriesIndex(spaceId);
};

export const buildHostNamesFilter = (hostNames: string[]) => {
  return { terms: { 'host.name': hostNames } };
};

export const buildUserNamesFilter = (userNames: string[]) => {
  return { terms: { 'user.name': userNames } };
};

export const buildEntityNameFilter = (
  entityNames: string[],
  riskEntity: RiskScoreEntity
): ESQuery => {
  return riskEntity === RiskScoreEntity.host
    ? { terms: { 'host.name': entityNames } }
    : { terms: { 'user.name': entityNames } };
};

export { RiskScoreEntity };
