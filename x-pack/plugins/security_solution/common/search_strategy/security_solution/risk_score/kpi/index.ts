/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IEsSearchRequest, IEsSearchResponse } from '@kbn/data-plugin/common';
import type { FactoryQueryTypes, RiskScoreEntity, RiskSeverity } from '../..';
import type { ESQuery } from '../../../../typed_json';

import type { Inspect, Maybe } from '../../../common';

export interface KpiRiskScoreRequestOptions extends IEsSearchRequest {
  defaultIndex: string[];
  factoryQueryType?: FactoryQueryTypes;
  filterQuery?: ESQuery | string | undefined;
  entity: RiskScoreEntity;
}

export interface KpiRiskScoreStrategyResponse extends IEsSearchResponse {
  inspect?: Maybe<Inspect>;
  kpiRiskScore: {
    [key in RiskSeverity]: number;
  };
}
