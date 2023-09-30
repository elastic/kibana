/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IEsSearchResponse } from '@kbn/data-plugin/common';
import type { Inspect, Maybe } from '../../../../common';

export interface NetworkKpiHistogramData {
  x?: Maybe<number>;
  y?: Maybe<number>;
}

export interface NetworkKpiUniquePrivateIpsStrategyResponse extends IEsSearchResponse {
  uniqueSourcePrivateIps: number;
  uniqueSourcePrivateIpsHistogram: NetworkKpiHistogramData[] | null;
  uniqueDestinationPrivateIps: number;
  uniqueDestinationPrivateIpsHistogram: NetworkKpiHistogramData[] | null;
  inspect?: Maybe<Inspect>;
}

export type UniquePrivateAttributeQuery = 'source' | 'destination';
