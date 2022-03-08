/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FactoryQueryTypes, RiskScoreAggByFields, RiskSeverity } from '../..';
import type {
  IEsSearchRequest,
  IEsSearchResponse,
} from '../../../../../../../../src/plugins/data/common';
import { ESQuery } from '../../../../typed_json';

import { Inspect, Maybe } from '../../../common';

export interface KpiRiskScoreRequestOptions extends IEsSearchRequest {
  defaultIndex: string[];
  factoryQueryType?: FactoryQueryTypes;
  filterQuery?: ESQuery | string | undefined;
  aggBy: RiskScoreAggByFields;
}

export interface KpiRiskScoreStrategyResponse extends IEsSearchResponse {
  inspect?: Maybe<Inspect>;
  kpiRiskScore: {
    [key in RiskSeverity]: number;
  };
}
