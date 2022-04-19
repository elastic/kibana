/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IEsSearchResponse } from '@kbn/data-plugin/common';
import { Inspect, Maybe } from '../../../../common';
import { RequestBasicOptions } from '../../..';
import { HostsKpiHistogramData } from '../common';

export type HostsKpiUniqueIpsRequestOptions = RequestBasicOptions;

export interface HostsKpiUniqueIpsStrategyResponse extends IEsSearchResponse {
  uniqueSourceIps: Maybe<number>;
  uniqueSourceIpsHistogram: Maybe<HostsKpiHistogramData[]>;
  uniqueDestinationIps: Maybe<number>;
  uniqueDestinationIpsHistogram: Maybe<HostsKpiHistogramData[]>;
  inspect?: Maybe<Inspect>;
}
