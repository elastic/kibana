/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';
import { SerializableRecord } from '@kbn/utility-types';
import { LocatorPublic } from '@kbn/share-plugin/common';
import { NodeLogsLocatorParams, TraceLogsLocatorParams } from '@kbn/deeplinks-observability';
import { LogViewReference } from '../log_views/types';
import { TimeRange } from './time_range';

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

export const ItemTypeRT = rt.keyof({
  host: null,
  pod: null,
  container: null,
  awsEC2: null,
  awsS3: null,
  awsSQS: null,
  awsRDS: null,
});

export type InventoryItemType = rt.TypeOf<typeof ItemTypeRT>;

export interface LogsSharedLocators {
  logsLocator: LocatorPublic<LogsLocatorParams>;
  nodeLogsLocator: LocatorPublic<NodeLogsLocatorParams>;
  traceLogsLocator: LocatorPublic<TraceLogsLocatorParams>;
}
