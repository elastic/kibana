/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SearchHit } from '../../../common';

interface AnomaliesOverTimeHistogramData {
  key_as_string: string;
  key: number;
  doc_count: number;
}

export interface AnomaliesActionGroupData {
  key: number;
  anomalies: {
    bucket: AnomaliesOverTimeHistogramData[];
  };
  doc_count: number;
}

export interface AnomalySource {
  [field: string]: any; // eslint-disable-line @typescript-eslint/no-explicit-any
}

export interface AnomalyHit extends SearchHit {
  sort: string[];
  _source: AnomalySource;
  aggregations: {
    [agg: string]: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  };
}
