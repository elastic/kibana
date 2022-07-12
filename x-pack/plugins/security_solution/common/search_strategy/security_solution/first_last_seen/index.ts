/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IEsSearchResponse } from '@kbn/data-plugin/common';

import type { Inspect, Maybe, Direction } from '../../common';
import type { RequestBasicOptions } from '../..';

export const FirstLastSeenQuery = 'firstlastseen';
export interface FirstLastSeenRequestOptions extends Partial<RequestBasicOptions> {
  order: Direction.asc | Direction.desc;
  field: string;
  value: string;
}

export interface FirstLastSeenStrategyResponse extends IEsSearchResponse {
  inspect?: Maybe<Inspect>;
  firstSeen?: Maybe<string>;
  lastSeen?: Maybe<string>;
}
