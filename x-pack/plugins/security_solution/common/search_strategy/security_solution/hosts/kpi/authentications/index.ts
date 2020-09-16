/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IEsSearchResponse } from '../../../../../../../../../src/plugins/data/common';
import { Inspect, Maybe } from '../../../../common';
import { RequestBasicOptions } from '../../..';
import { HostsKpiHistogramData } from '../common';

export interface HostsKpiAuthHistogramCount {
  doc_count: number;
}

export type HostsKpiAuthenticationsRequestOptions = RequestBasicOptions;

export interface HostsKpiAuthenticationsStrategyResponse extends IEsSearchResponse {
  authSuccess?: Maybe<number>;
  authSuccessHistogram?: Maybe<HostsKpiHistogramData[]>;
  authFailure?: Maybe<number>;
  authFailureHistogram?: Maybe<HostsKpiHistogramData[]>;
  inspect?: Maybe<Inspect>;
}
