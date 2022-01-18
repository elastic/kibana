/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  OSQUERY_LIVE_QUERIES_CHANNEL_NAME,
  LiveQueryEvent,
} from './services/live_query_sender';
export interface OsqueryTelemetryChannelEvents {
  // channel name => event type
  [OSQUERY_LIVE_QUERIES_CHANNEL_NAME]: LiveQueryEvent;
}

export type OsqueryTelemetryChannel = keyof OsqueryTelemetryChannelEvents;
