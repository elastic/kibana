/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { IEsSearchResponse } from '@kbn/data-plugin/common';

import { Inspect, Maybe, TimerangeInput } from '../../../common';
import { HostItem, HostsFields } from '../common';
import { RequestOptionsPaginated } from '../..';

export interface HostDetailsStrategyResponse extends IEsSearchResponse {
  hostDetails: HostItem;
  inspect?: Maybe<Inspect>;
}

export interface HostDetailsRequestOptions extends Partial<RequestOptionsPaginated<HostsFields>> {
  hostName: string;
  skip?: boolean;
  timerange: TimerangeInput;
  inspect?: Maybe<Inspect>;
}

export interface AggregationRequest {
  [aggField: string]: estypes.AggregationsAggregationContainer;
}
