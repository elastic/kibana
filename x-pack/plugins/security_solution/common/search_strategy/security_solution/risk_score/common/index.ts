/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ESQuery } from '../../../../typed_json';
import { RISKY_HOSTS_INDEX_PREFIX, RISKY_USERS_INDEX_PREFIX } from '../../../../constants';
import {
  RiskScoreEntity,
  getRiskScoreLatestIndex,
  getRiskScoreTimeSeriesIndex,
} from '../../../../entity_analytics/risk_engine';
export { RiskQueries } from '../../../../api/search_strategy';

/**
 * Make sure this aligns with the index in step 6, 9 in
 * prebuilt_dev_tool_content/console_templates/enable_host_risk_score.console
 */
export const getHostRiskIndex = (
  spaceId: string,
  onlyLatest: boolean = true,
  isNewRiskScoreModuleInstalled: boolean
): string => {
  if (isNewRiskScoreModuleInstalled) {
    return onlyLatest ? getRiskScoreLatestIndex(spaceId) : getRiskScoreTimeSeriesIndex(spaceId);
  } else {
    return `${RISKY_HOSTS_INDEX_PREFIX}${onlyLatest ? 'latest_' : ''}${spaceId}`;
  }
};

export const getUserRiskIndex = (
  spaceId: string,
  onlyLatest: boolean = true,
  isNewRiskScoreModuleInstalled: boolean
): string => {
  if (isNewRiskScoreModuleInstalled) {
    return onlyLatest ? getRiskScoreLatestIndex(spaceId) : getRiskScoreTimeSeriesIndex(spaceId);
  } else {
    return `${RISKY_USERS_INDEX_PREFIX}${onlyLatest ? 'latest_' : ''}${spaceId}`;
  }
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
