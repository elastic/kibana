/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IEsSearchResponse } from '../../../../../../../../src/plugins/data/common';
import { Inspect, Maybe } from '../../../common';
import { RequestOptionsPaginated } from '../..';
import { HostsFields } from '../common';

export interface HostFirstLastSeenRequestOptions
  extends Partial<RequestOptionsPaginated<HostsFields>> {
  hostName: string;
}
export interface HostFirstLastSeenStrategyResponse extends IEsSearchResponse {
  inspect?: Maybe<Inspect>;
  firstSeen?: Maybe<string>;
  lastSeen?: Maybe<string>;
}
