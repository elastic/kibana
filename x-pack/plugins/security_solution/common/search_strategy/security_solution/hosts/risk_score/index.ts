/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FactoryQueryTypes } from '../..';
import {
  IEsSearchRequest,
  IEsSearchResponse,
} from '../../../../../../../../src/plugins/data/common';
import { Inspect, Maybe } from '../../../common';

export interface HostRiskScoreRequestOptions extends IEsSearchRequest {
  defaultIndex: string[];
  factoryQueryType?: FactoryQueryTypes;
  hostName: string;
}
export interface HostRiskScoreStrategyResponse extends IEsSearchResponse {
  hostRiskScore?: HostRiskScore;
  inspect?: Maybe<Inspect>;
}

export interface HostRiskScoreResponse {
  risk_score: number;
  risk: string;
}

export interface HostRiskScore {
  riskScore: number;
  risk: string;
}
