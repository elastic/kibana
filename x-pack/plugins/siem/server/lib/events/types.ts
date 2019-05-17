/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EventsData,
  LastEventIndexKey,
  LastEventTimeData,
  LastTimeDetails,
  SourceConfiguration,
  TimelineData,
  TimelineDetailsData,
} from '../../graphql/types';
import { FrameworkRequest, RequestOptions } from '../framework';
import { SearchHit } from '../types';

export interface EventsAdapter {
  getEvents(req: FrameworkRequest, options: RequestOptions): Promise<EventsData>;
  getTimelineData(req: FrameworkRequest, options: EventsRequestOptions): Promise<TimelineData>;
  getTimelineDetails(
    req: FrameworkRequest,
    options: RequestDetailsOptions
  ): Promise<TimelineDetailsData>;
  getLastEventTimeData(
    req: FrameworkRequest,
    options: LastEventTimeRequestOptions
  ): Promise<LastEventTimeData>;
}

export interface EventsRequestOptions extends RequestOptions {
  fieldRequested: string[];
}

export interface EventSource {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [field: string]: any;
}

export interface EventHit extends SearchHit {
  sort: string[];
  _source: EventSource;
  aggregations: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [agg: string]: any;
  };
}

export interface LastEventTimeHit extends SearchHit {
  aggregations: {
    last_seen_event: {
      value_as_string: string;
    };
  };
}
export interface LastEventTimeRequestOptions {
  indexKey: LastEventIndexKey;
  details: LastTimeDetails;
  sourceConfiguration: SourceConfiguration;
}

export interface TimerangeFilter {
  range: {
    [timestamp: string]: {
      gte: number;
      lte: number;
    };
  };
}

export interface RequestDetailsOptions {
  indexName: string;
  eventId: string;
}
