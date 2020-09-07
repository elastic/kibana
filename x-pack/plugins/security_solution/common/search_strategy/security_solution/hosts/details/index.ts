/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IEsSearchResponse } from '../../../../../../../../src/plugins/data/common';

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
