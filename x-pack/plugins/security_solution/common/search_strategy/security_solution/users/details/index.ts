/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IEsSearchResponse } from '@kbn/data-plugin/common';

import { Inspect, Maybe, TimerangeInput } from '../../../common';
import { UserItem } from '../common';
import { RequestBasicOptions } from '../..';

export interface UserDetailsStrategyResponse extends IEsSearchResponse {
  userDetails: UserItem;
  inspect?: Maybe<Inspect>;
}

export interface UserDetailsRequestOptions extends Partial<RequestBasicOptions> {
  userName: string;
  skip?: boolean;
  timerange: TimerangeInput;
  inspect?: Maybe<Inspect>;
}
