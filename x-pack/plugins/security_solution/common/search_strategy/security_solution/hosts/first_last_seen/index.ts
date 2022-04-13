/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IEsSearchResponse } from '../../../../../../../../src/plugins/data/common';
import { Inspect, Maybe, Direction } from '../../../common';
import { RequestOptionsPaginated } from '../..';
import { HostsFields } from '../common';

export interface HostFirstLastSeenRequestOptions
  extends Partial<RequestOptionsPaginated<HostsFields>> {
  hostName: string;
  order: Direction.asc | Direction.desc;
}

export interface HostFirstLastSeenStrategyResponse extends IEsSearchResponse {
  inspect?: Maybe<Inspect>;
  firstSeen?: Maybe<string>;
  lastSeen?: Maybe<string>;
}
