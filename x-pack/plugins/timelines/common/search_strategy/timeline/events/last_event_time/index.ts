/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IEsSearchResponse } from '@kbn/data-plugin/common';
import { LastEventIndexKey } from '../../../../api/search_strategy/timeline/events_last_event_time';
import { Inspect, Maybe } from '../../../common';
import { TimelineRequestBasicOptions } from '../..';

export interface LastTimeDetails {
  hostName?: Maybe<string>;
  userName?: Maybe<string>;
  ip?: Maybe<string>;
}

export interface TimelineEventsLastEventTimeStrategyResponse extends IEsSearchResponse {
  lastSeen: Maybe<string>;
  inspect?: Maybe<Inspect>;
}
export type TimelineKpiStrategyRequest = Omit<TimelineRequestBasicOptions, 'runtimeMappings'>;

export interface TimelineKpiStrategyResponse extends IEsSearchResponse {
  destinationIpCount: number;
  inspect?: Maybe<Inspect>;
  hostCount: number;
  processCount: number;
  sourceIpCount: number;
  userCount: number;
}

export interface TimelineEventsLastEventTimeRequestOptions
  extends Omit<TimelineRequestBasicOptions, 'filterQuery' | 'timerange' | 'runtimeMappings'> {
  indexKey: LastEventIndexKey;
  details: LastTimeDetails;
}
