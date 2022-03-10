/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { IEsSearchResponse } from '../../../../../../../../src/plugins/data/common';

import { Inspect, Maybe, TimerangeInput } from '../../../common';
import { UserItem, UsersFields } from '../common';
import { RequestOptionsPaginated } from '../..';

export interface UserDetailsStrategyResponse extends IEsSearchResponse {
  userDetails: UserItem;
  inspect?: Maybe<Inspect>;
}

export interface UserDetailsRequestOptions extends Partial<RequestOptionsPaginated<UsersFields>> {
  userName: string;
  skip?: boolean;
  timerange: TimerangeInput;
  inspect?: Maybe<Inspect>;
}

export interface AggregationRequest {
  [aggField: string]: estypes.AggregationsAggregationContainer;
}
