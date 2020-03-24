/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IEvent, IEventLogger, IEventLogService } from './index';
import { ECS_VERSION } from './types';
import { EventLogService } from './event_log_service';
import { EsContext } from './es/context';
import { contextMock } from './es/context.mock';
import { loggerMock, MockedLogger } from '../../../../src/core/server/logging/logger.mock';
import { delay } from './lib/delay';
import { EVENT_LOGGED_PREFIX } from './event_logger';

const KIBANA_SERVER_UUID = '424-24-2424';

describe('EventLogger', () => {
  let systemLogger: MockedLogger;
  let esContext: EsContext;
  let service: IEventLogService;
  let eventLogger: IEventLogger;

  beforeEach(() => {
    systemLogger = loggerMock.create();
    esContext = contextMock.create();
    service = new EventLogService({
      esContext,
      systemLogger,
      config: { enabled: true, logEntries: true, indexEntries: false },
      kibanaUUID: KIBANA_SERVER_UUID,
    });
    eventLogger = service.getLogger({});
  });

  test('method logEvent() writes expected default values', async () => {
    service.registerProviderActions('test-provider', ['test-action-1']);
    eventLogger = service.getLogger({
      event: { provider: 'test-provider', action: 'test-action-1' },
    });

    const dateStart = new Date().valueOf();
    eventLogger.logEvent({});
    const event = await waitForLogEvent(systemLogger);
    const dateEnd = new Date().valueOf();

    expect(event).toMatchObject({
      event: {
        provider: 'test-provider',
        action: 'test-action-1',
      },
      '@timestamp': expect.stringMatching(/.*/),
      ecs: {
        version: ECS_VERSION,
      },
      kibana: {
        server_uuid: '424-24-2424',
      },
    });

    const $timeStamp = event!['@timestamp']!;
    const timeStamp = new Date($timeStamp);
    expect(timeStamp).not.toBeNaN();

    const timeStampValue = timeStamp.valueOf();
    expect(timeStampValue).toBeGreaterThanOrEqual(dateStart);
    expect(timeStampValue).toBeLessThanOrEqual(dateEnd);
  });

  test('method logEvent() merges event data', async () => {
    service.registerProviderActions('test-provider', ['a', 'b']);
    eventLogger = service.getLogger({
      event: { provider: 'test-provider', action: 'a' },
    });

    const ignoredTimestamp = '1999-01-01T00:00:00Z';
    eventLogger.logEvent({
      '@timestamp': ignoredTimestamp,
      event: {
        action: 'b',
      },
    });
    const event = await waitForLogEvent(systemLogger);

    expect(event!['@timestamp']).not.toEqual(ignoredTimestamp);
    expect(event?.event?.action).toEqual('b');
  });

  test('timing methods work', async () => {
    const delayMS = 100;
    const event: IEvent = {};
    eventLogger.startTiming(event);

    const timeStart = event.event!.start!;
    expect(timeStart).toBeTruthy();
    const timeStartValue = new Date(timeStart).valueOf();

    await delay(delayMS);
    eventLogger.stopTiming(event);

    const timeStop = event.event!.end!;
    expect(timeStop).toBeTruthy();
    const timeStopValue = new Date(timeStop).valueOf();

    expect(timeStopValue).toBeGreaterThanOrEqual(timeStartValue);

    const duration = event.event!.duration!;
    expect(duration).toBeGreaterThan(0.95 * delayMS * 1000 * 1000);
    expect(duration / (1000 * 1000)).toBeCloseTo(timeStopValue - timeStartValue);
  });

  test('timing method endTiming() method works when startTiming() is not called', async () => {
    const event: IEvent = {};
    eventLogger.stopTiming(event);

    expect(event.event).toBeUndefined();
  });

  test('timing method endTiming() method works event contains bad data', async () => {
    const event: IEvent = {
      event: {
        start: 'not a date that can be parsed',
      },
    };
    eventLogger.stopTiming(event);

    expect(event.event!.end).toBeUndefined();
    expect(event.event!.duration).toBeUndefined();
  });

  test('logs warnings when using unregistered actions and providers', async () => {
    service.registerProviderActions('provider', ['action-a', 'action-b']);
    eventLogger = service.getLogger({});

    let message: string;

    eventLogger.logEvent({ event: { provider: 'provider-X', action: 'action-a' } });
    message = await waitForLogMessage(systemLogger);
    expect(message).toMatch(/invalid event logged.*provider-X.*action-a.*/);

    eventLogger.logEvent({ event: { action: 'action-a' } });
    message = await waitForLogMessage(systemLogger);
    expect(message).toMatch(/invalid event logged.*provider.*undefined.*/);

    eventLogger.logEvent({ event: { provider: 'provider', action: 'action-c' } });
    message = await waitForLogMessage(systemLogger);
    expect(message).toMatch(/invalid event logged.*provider.*action-c.*/);

    eventLogger.logEvent({ event: { provider: 'provider' } });
    message = await waitForLogMessage(systemLogger);
    expect(message).toMatch(/invalid event logged.*action.*undefined.*/);
  });
});

// return the next logged event; throw if not an event
async function waitForLogEvent(mockLogger: MockedLogger, waitSeconds: number = 1): Promise<IEvent> {
  const result = await waitForLog(mockLogger, waitSeconds);
  if (typeof result === 'string') throw new Error('expecting an event');
  return result;
}

// return the next logged message; throw if it is an event
async function waitForLogMessage(
  mockLogger: MockedLogger,
  waitSeconds: number = 1
): Promise<string> {
  const result = await waitForLog(mockLogger, waitSeconds);
  if (typeof result !== 'string') throw new Error('expecting a message');
  return result;
}

// return the next logged message, if it's an event log entry, parse it
async function waitForLog(
  mockLogger: MockedLogger,
  waitSeconds: number = 1
): Promise<string | IEvent> {
  const intervals = 4;
  const interval = (waitSeconds * 1000) / intervals;

  // break the waiting time into some intervals
  for (let i = 0; i <= intervals; i++) {
    await delay(interval);

    const calls = mockLogger.warn.mock.calls.concat(mockLogger.info.mock.calls);
    if (calls.length === 0) continue;

    const call = calls[0][0];
    mockLogger.info.mockReset();
    mockLogger.warn.mockReset();

    if (typeof call !== 'string') throw new Error(`expecting a string: ${call}`);
    if (!call.startsWith(EVENT_LOGGED_PREFIX)) {
      return call;
    } else {
      return JSON.parse(call.substr(EVENT_LOGGED_PREFIX.length));
    }
  }

  mockLogger.info.mockReset();
  mockLogger.warn.mockReset();
  throw new Error(`expecting a log message in ${waitSeconds} seconds, but did not get it`);
}
