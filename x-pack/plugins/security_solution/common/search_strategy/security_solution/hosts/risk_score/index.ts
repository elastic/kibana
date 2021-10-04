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
import { Inspect, Maybe, TimerangeInput } from '../../../common';

export interface HostsRiskScoreRequestOptions extends IEsSearchRequest {
  defaultIndex: string[];
  factoryQueryType?: FactoryQueryTypes;
  hostName?: string;
  timerange?: TimerangeInput;
}

export interface HostsRiskScoreStrategyResponse extends IEsSearchResponse {
  inspect?: Maybe<Inspect>;
}

export interface HostsRiskScore {
  host: {
    name: string;
  };
  risk_score: number;
  risk: string;
}
