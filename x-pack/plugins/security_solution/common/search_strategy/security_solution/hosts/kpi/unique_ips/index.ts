/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IEsSearchResponse } from '@kbn/data-plugin/common';
import type { Inspect, Maybe } from '../../../../common';
import type { RequestBasicOptions } from '../../..';
import type { HostsKpiHistogramData } from '../common';

export type HostsKpiUniqueIpsRequestOptions = RequestBasicOptions;

export interface HostsKpiUniqueIpsStrategyResponse extends IEsSearchResponse {
  uniqueSourceIps: Maybe<number>;
  uniqueSourceIpsHistogram: Maybe<HostsKpiHistogramData[]>;
  uniqueDestinationIps: Maybe<number>;
  uniqueDestinationIpsHistogram: Maybe<HostsKpiHistogramData[]>;
  inspect?: Maybe<Inspect>;
}
