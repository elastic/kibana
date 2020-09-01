/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IEsSearchResponse } from '../../../../../../../../src/plugins/data/common';

import { HostItem, HostsFields } from '../common';
import { Inspect, Maybe, RequestOptionsPaginated, TimerangeInput } from '../..';

export interface HostOverviewStrategyResponse extends IEsSearchResponse {
  hostOverview: HostItem;
  inspect?: Maybe<Inspect>;
}

export interface HostOverviewRequestOptions extends Partial<RequestOptionsPaginated<HostsFields>> {
  hostName: string;
  skip?: boolean;
  timerange: TimerangeInput;
  inspect?: Maybe<Inspect>;
}
