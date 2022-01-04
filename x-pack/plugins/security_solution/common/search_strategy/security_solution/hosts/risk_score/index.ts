/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FactoryQueryTypes } from '../..';
import type {
  IEsSearchRequest,
  IEsSearchResponse,
} from '../../../../../../../../src/plugins/data/common';
import { RISKY_HOSTS_INDEX_PREFIX } from '../../../../constants';
import { Inspect, Maybe, TimerangeInput } from '../../../common';

export interface HostsRiskScoreRequestOptions extends IEsSearchRequest {
  defaultIndex: string[];
  factoryQueryType?: FactoryQueryTypes;
  hostNames?: string[];
  timerange?: TimerangeInput;
}

export interface HostsRiskScoreStrategyResponse extends IEsSearchResponse {
  inspect?: Maybe<Inspect>;
}

export interface HostsRiskScore {
  host: {
    name: string;
  };
  risk: string;
  risk_stats: {
    rule_risks: RuleRisk[];
    risk_score: number;
  };
}

export interface RuleRisk {
  rule_name: string;
  rule_risk: string;
}

export const getHostRiskIndex = (spaceId: string): string => {
  return `${RISKY_HOSTS_INDEX_PREFIX}${spaceId}`;
};
