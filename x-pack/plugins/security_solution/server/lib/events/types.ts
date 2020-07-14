/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  LastEventIndexKey,
  LastEventTimeData,
  LastTimeDetails,
  SourceConfiguration,
  TimelineData,
  TimelineDetailsData,
} from '../../graphql/types';
import { FrameworkRequest, RequestOptions, RequestOptionsPaginated } from '../framework';
import { SearchHit } from '../types';

export interface EventsAdapter {
  getTimelineData(req: FrameworkRequest, options: TimelineRequestOptions): Promise<TimelineData>;
  getTimelineDetails(
    req: FrameworkRequest,
    options: RequestDetailsOptions
  ): Promise<TimelineDetailsData>;
  getLastEventTimeData(
    req: FrameworkRequest,
    options: LastEventTimeRequestOptions
  ): Promise<LastEventTimeData>;
}

export interface TimelineRequestOptions extends RequestOptions {
  fieldRequested: string[];
}

export interface EventsRequestOptions extends RequestOptionsPaginated {
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
  defaultIndex: string[];
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
  defaultIndex: string[];
}

interface EventsOverTimeHistogramData {
  key_as_string: string;
  key: number;
  doc_count: number;
}

export interface EventsActionGroupData {
  key: number;
  events: {
    bucket: EventsOverTimeHistogramData[];
  };
  doc_count: number;
}
