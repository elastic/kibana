/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IEvent, IEventLogger, IEventLogService } from '.';
import { ECS_VERSION } from './types';
import { EventLogService } from './event_log_service';
import { EsContext } from './es/context';
import { contextMock } from './es/context.mock';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import { delay } from './lib/delay';
import { EVENT_LOGGED_PREFIX } from './event_logger';
import { savedObjectProviderRegistryMock } from './saved_object_provider_registry.mock';

const KIBANA_SERVER_UUID = '424-24-2424';
const WRITE_LOG_WAIT_MILLIS = 3000;

describe('EventLogger', () => {
  let systemLogger: ReturnType<typeof loggingSystemMock.createLogger>;
  let esContext: jest.Mocked<EsContext>;
  let service: IEventLogService;
  let eventLogger: IEventLogger;

  beforeEach(() => {
    jest.resetAllMocks();
    systemLogger = loggingSystemMock.createLogger();
    esContext = contextMock.create();
    service = new EventLogService({
      esContext,
      systemLogger,
      config: { logEntries: true, indexEntries: true },
      kibanaUUID: KIBANA_SERVER_UUID,
      savedObjectProviderRegistry: savedObjectProviderRegistryMock.create(),
      kibanaVersion: '1.0.1',
    });
    eventLogger = service.getLogger({});
  });

  test('handles successful initialization', async () => {
    service.registerProviderActions('test-provider', ['test-action-1']);
    eventLogger = service.getLogger({
      event: { provider: 'test-provider', action: 'test-action-1' },
    });

    eventLogger.logEvent({});
    await waitForLogEvent(systemLogger);
    delay(WRITE_LOG_WAIT_MILLIS); // sleep a bit since event logging is async
    expect(esContext.esAdapter.indexDocument).toHaveBeenCalled();
  });

  test('handles failed initialization', async () => {
    service.registerProviderActions('test-provider', ['test-action-1']);
    eventLogger = service.getLogger({
      event: { provider: 'test-provider', action: 'test-action-1' },
    });
    esContext.waitTillReady.mockImplementation(async () => false);

    eventLogger.logEvent({});
    await waitForLogEvent(systemLogger);
    delay(WRITE_LOG_WAIT_MILLIS); // sleep a bit longer since event logging is async
    expect(esContext.esAdapter.indexDocument).toHaveBeenCalled();
    expect(esContext.esAdapter.indexDocuments).not.toHaveBeenCalled();
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
        version: '1.0.1',
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

    const respectedTimestamp = '2999-01-01T00:00:00.000Z';
    eventLogger.logEvent({
      '@timestamp': respectedTimestamp,
      event: {
        action: 'b',
      },
    });
    const event = await waitForLogEvent(systemLogger);

    expect(event!['@timestamp']).toEqual(respectedTimestamp);
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

  test('logs warnings when writing invalid events', async () => {
    service.registerProviderActions('provider', ['action-a']);
    eventLogger = service.getLogger({});

    eventLogger.logEvent({ event: { PROVIDER: 'provider' } } as unknown as IEvent);
    let message = await waitForLogMessage(systemLogger);
    expect(message).toMatch(/invalid event logged.*provider.*undefined.*/);

    const event: IEvent = {
      event: {
        provider: 'provider',
        action: 'action-a',
      },
      kibana: {
        saved_objects: [
          {
            rel: 'ZZZ-primary',
            namespace: 'default',
            type: 'event_log_test',
            id: '123',
          },
        ],
      },
    };
    eventLogger.logEvent(event);
    message = await waitForLogMessage(systemLogger);
    expect(message).toMatch(/invalid rel property.*ZZZ-primary.*/);
  });
});

// return the next logged event; throw if not an event
async function waitForLogEvent(
  mockLogger: ReturnType<typeof loggingSystemMock.createLogger>,
  waitSeconds: number = 1
): Promise<IEvent> {
  const result = await waitForLog(mockLogger, waitSeconds);
  if (typeof result === 'string') throw new Error('expecting an event');
  return result;
}

// return the next logged message; throw if it is an event
async function waitForLogMessage(
  mockLogger: ReturnType<typeof loggingSystemMock.createLogger>,
  waitSeconds: number = 1
): Promise<string> {
  const result = await waitForLog(mockLogger, waitSeconds);
  if (typeof result !== 'string') throw new Error('expecting a message');
  return result;
}

// return the next logged message, if it's an event log entry, parse it
async function waitForLog(
  mockLogger: ReturnType<typeof loggingSystemMock.createLogger>,
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
