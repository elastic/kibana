/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mapKeys, snakeCase } from 'lodash';
import type { Logger } from 'src/core/server';

import type { TelemetryEventsSender } from '../sender';
import type { AgentSelection, ECSMappingOrUndefined } from '../../../common/schemas/common';

export interface LiveQueryEvent {
  // tables: {
  //   [key: string]: {
  //     all: boolean;
  //     columns: string[];
  //   };
  // };
  // ecs_mapping: ECSMappingOrUndefined;
  agentSelection?: AgentSelection;
  eventSource?: LiveQueryEventSourceType;
  savedQuery?: boolean;
}

export enum LiveQueryEventSourceType {
  OSQUERY_APP_LIVE_QUERY_PAGE = 'osquery_app_live_query',
  OSQUERY_APP_SAVED_QUERY_TEST_PAGE = 'osquery_app_saved_query_test',
  OSQUERY_API = 'osquery_api',
  METRICS_APP = 'metrics_app',
  CASES_APP = 'cases_app',
}

export const OSQUERY_LIVE_QUERIES_CHANNEL_NAME = 'osquery-live-queries-test';

export function sendTelemetryEvents(
  logger: Logger,
  eventsTelemetry: TelemetryEventsSender | undefined,
  upgradeEvent: LiveQueryEvent
) {
  if (eventsTelemetry === undefined) {
    return;
  }

  try {
    eventsTelemetry.queueTelemetryEvents(OSQUERY_LIVE_QUERIES_CHANNEL_NAME, [
      mapKeys(upgradeEvent, (value, key) => snakeCase(key)),
    ]);
  } catch (exc) {
    logger.error(`queuing telemetry events failed ${exc}`);
  }
}
