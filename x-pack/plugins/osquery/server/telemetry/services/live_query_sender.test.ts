/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from 'src/core/server';
import { loggingSystemMock } from 'src/core/server/mocks';

import type { TelemetryEventsSender } from '../sender';
import { createMockTelemetryEventsSender } from '../__mocks__';

import {
  sendTelemetryEvents,
  LiveQueryEventSourceType,
  OSQUERY_LIVE_QUERIES_CHANNEL_NAME,
} from './live_query_sender';

describe('sendTelemetryEvents', () => {
  let eventsTelemetryMock: jest.Mocked<TelemetryEventsSender>;
  let loggerMock: jest.Mocked<Logger>;

  beforeEach(() => {
    eventsTelemetryMock = createMockTelemetryEventsSender();
    loggerMock = loggingSystemMock.createLogger();
  });

  it('should queue telemetry event with simple query', () => {
    const event = {
      query: 'select * from processes',
      event_source: LiveQueryEventSourceType.OSQUERY_APP_LIVE_QUERY_PAGE,
      ecs_mapping: {
        'process.entity_id': { field: 'pid' },
        'user.id': { field: 'uid' },
        'event.type': { value: ['process'] },
      },
      agent_selection: {
        agents: [],
        allAgentsSelected: true,
        platformsSelected: [],
        policiesSelected: [],
      },
    };

    sendTelemetryEvents(loggerMock, eventsTelemetryMock, event);

    expect(eventsTelemetryMock.queueTelemetryEvents).toHaveBeenCalledWith(
      OSQUERY_LIVE_QUERIES_CHANNEL_NAME,
      [
        {
          agent_selection: {
            agents: 0,
            all_agents_selected: true,
            platforms_selected: [],
            policies: 0,
          },
          ecs_mapping: [
            {
              key: 'process.entity_id',
              value: 'pid',
            },
            {
              key: 'user.id',
              value: 'uid',
            },
            {
              key: 'event.type',
              static: true,
            },
          ],
          event_source: LiveQueryEventSourceType.OSQUERY_APP_LIVE_QUERY_PAGE,
          table: [
            {
              name: 'processes',
              columns: ['*'],
            },
          ],
        },
      ]
    );
  });

  it('should queue telemetry event with multi table query', () => {
    const event = {
      query:
        'select i.*, p.resident_size, p.user_time, p.system_time, time.minutes as counter from osquery_info i, processes p, time where p.pid = i.pid;',
      event_source: LiveQueryEventSourceType.OSQUERY_APP_SAVED_QUERY_TEST_PAGE,
      agent_selection: {
        agents: ['8454664d-a762-4b81-8096-014fdde8f963'],
        allAgentsSelected: false,
        platformsSelected: ['darwin'],
        policiesSelected: ['499b5aa7-d214-5b5d-838b-3cd76469844e'],
      },
    };

    sendTelemetryEvents(loggerMock, eventsTelemetryMock, event);

    expect(eventsTelemetryMock.queueTelemetryEvents).toHaveBeenCalledWith(
      OSQUERY_LIVE_QUERIES_CHANNEL_NAME,
      [
        {
          agent_selection: {
            agents: 1,
            all_agents_selected: false,
            platforms_selected: ['darwin'],
            policies: 1,
          },
          event_source: LiveQueryEventSourceType.OSQUERY_APP_SAVED_QUERY_TEST_PAGE,
          table: [
            {
              name: 'osquery_info',
              columns: ['*'],
            },
            {
              name: 'processes',
              columns: ['resident_size', 'user_time', 'system_time'],
            },
            {
              name: 'time',
              columns: ['minutes'],
            },
          ],
        },
      ]
    );
  });
});
