/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SearchHit } from '../../../common';

interface EventsMatrixHistogramData {
  key_as_string: string;
  key: number;
  doc_count: number;
}

export interface EventSource {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [field: string]: any;
}

export interface EventsActionGroupData {
  key: number;
  events: {
    bucket: EventsMatrixHistogramData[];
  };
  doc_count: number;
}

export interface EventHit extends SearchHit {
  sort: string[];
  _source: EventSource;
  fields: Record<string, unknown[]>;
  aggregations: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [agg: string]: any;
  };
}
