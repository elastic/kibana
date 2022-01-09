/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty, pickBy } from 'lodash';
import type { Logger } from 'src/core/server';
import { AgentSelection, ECSMappingOrUndefined } from '../../../common/schemas/common';

import type { TelemetryEventsSender } from '../sender';
import { getOsqueryTablesFromQuery, getEcsMapping, getAgentSelection } from './utils';

export interface LiveQueryEvent {
  table: Array<{
    name: string;
    columns: string[];
  }>;
  ecs_mapping: Array<{
    key: string;
    value?: string;
    static?: boolean;
  }>;
  agent_selection?: {
    agents: number;
    all_agents_selected: boolean;
    platforms_selected: string[];
    policies: number;
  };
  event_source?: LiveQueryEventSourceType;
  saved_query?: boolean;
}

export enum LiveQueryEventSourceType {
  OSQUERY_APP_LIVE_QUERY_PAGE = 'osquery_app_live_query',
  OSQUERY_APP_SAVED_QUERY_TEST_PAGE = 'osquery_app_saved_query_test',
  OSQUERY_API = 'osquery_api',
  METRICS_APP = 'metrics_app',
  CASES_APP = 'cases_app',
}

export const OSQUERY_LIVE_QUERIES_CHANNEL_NAME = 'osquery-live-queries';

export function sendTelemetryEvents(
  logger: Logger,
  eventsTelemetry: TelemetryEventsSender | undefined,
  liveQueryEvent: Record<string, unknown>
) {
  if (eventsTelemetry === undefined) {
    return;
  }

  try {
    const eventData = pickBy(
      {
        saved_query: liveQueryEvent.saved_query,
        event_source: liveQueryEvent.event_source,
        table: getOsqueryTablesFromQuery(liveQueryEvent.query as string),
        agent_selection: getAgentSelection(liveQueryEvent.agent_selection as AgentSelection),
        ecs_mapping: getEcsMapping(liveQueryEvent.ecs_mapping as ECSMappingOrUndefined),
      },
      (value) => !isEmpty(value)
    );

    eventsTelemetry.queueTelemetryEvents(OSQUERY_LIVE_QUERIES_CHANNEL_NAME, [
      // @ts-expect-error update types
      eventData,
    ]);
  } catch (exc) {
    logger.error(`queuing telemetry events failed ${exc}`);
  }
}
