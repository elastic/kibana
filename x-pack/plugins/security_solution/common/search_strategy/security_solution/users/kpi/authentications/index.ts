/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IEsSearchResponse } from '@kbn/data-plugin/common';
import type { Inspect, Maybe } from '../../../../common';
import type { KpiHistogramData, RequestBasicOptions } from '../../..';

export type UsersKpiAuthenticationsRequestOptions = RequestBasicOptions;

export interface UsersKpiAuthenticationsStrategyResponse extends IEsSearchResponse {
  authenticationsSuccess: Maybe<number>;
  authenticationsSuccessHistogram: Maybe<KpiHistogramData[]>;
  authenticationsFailure: Maybe<number>;
  authenticationsFailureHistogram: Maybe<KpiHistogramData[]>;
  inspect?: Maybe<Inspect>;
}
