/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IEsSearchResponse } from '../../../../../../../../src/plugins/data/common';
import { Inspect, Maybe } from '../../../common';
import { TimelineRequestBasicOptions } from '../..';

export enum LastEventIndexKey {
  hostDetails = 'hostDetails',
  hosts = 'hosts',
  ipDetails = 'ipDetails',
  network = 'network',
}

export interface LastTimeDetails {
  hostName?: Maybe<string>;
  ip?: Maybe<string>;
}

export interface TimelineEventsLastEventTimeStrategyResponse extends IEsSearchResponse {
  lastSeen: Maybe<string>;
  inspect?: Maybe<Inspect>;
}

export interface TimelineKpiStrategyResponse extends IEsSearchResponse {
  destinationIpCount: number;
  inspect?: Maybe<Inspect>;
  hostCount: number;
  processCount: number;
  sourceIpCount: number;
  userCount: number;
}

export interface TimelineEventsLastEventTimeRequestOptions
  extends Omit<TimelineRequestBasicOptions, 'filterQuery' | 'timerange'> {
  indexKey: LastEventIndexKey;
  details: LastTimeDetails;
}
