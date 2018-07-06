/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { LogEntryFieldsMapping } from '../log_entry';

export interface LogSummaryBucket {
  count: number;
  end: number;
  start: number;
}

export type LogSummaryFieldsMapping = Pick<LogEntryFieldsMapping, 'time'>;

export type SummaryBucketSize = 'y' | 'M' | 'w' | 'd' | 'h' | 'm' | 's';
