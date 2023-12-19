/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SerializableRecord } from '@kbn/utility-types';
import type { TimeRange } from './time_range';
import type { LogViewReference } from '../log_views/types';

export const LOGS_LOCATOR_ID = 'LOGS_LOCATOR';

export interface LogsLocatorParams extends SerializableRecord {
  /** Defines log position */
  time?: number;
  /**
   * Optionally set the time range in the time picker.
   */
  timeRange?: TimeRange;
  filter?: string;
  logView?: LogViewReference;
}
