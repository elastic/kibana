/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EventDetailsData, EventsData } from '../../graphql/types';
import { FrameworkRequest, RequestOptions } from '../framework';
import { SearchHit } from '../types';

export interface EventsAdapter {
  getEvents(req: FrameworkRequest, options: RequestOptions): Promise<EventsData>;
  getEventDetails(req: FrameworkRequest, options: RequestDetailsOptions): Promise<EventDetailsData>;
}

export interface EventSource {
  // tslint:disable-next-line:no-any
  [field: string]: any;
}

export interface EventHit extends SearchHit {
  sort: string[];
  _source: EventSource;
  aggregations: {
    // tslint:disable-next-line:no-any
    [agg: string]: any;
  };
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
