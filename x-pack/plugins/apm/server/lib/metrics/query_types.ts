/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Setup } from '../helpers/setup_request';

export interface MetricsRequestArgs {
  serviceName: string;
  setup: Setup;
}

export interface AggValue {
  value: number | null;
}

export interface TimeSeriesBucket {
  key_as_string: string; // timestamp as string
  key: number; // timestamp as epoch milliseconds
  doc_count: number;
}
