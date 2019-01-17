/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EventsData } from '../../graphql/types';
import { FrameworkRequest, RequestOptions } from '../framework';
import { SearchHit } from '../types';

export interface EventsAdapter {
  getEvents(req: FrameworkRequest, options: RequestOptions): Promise<EventsData>;
}

export interface EventHit extends SearchHit {
  sort: string[];
  _source: {
    // tslint:disable-next-line:no-any
    [field: string]: any;
  };
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
