/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IEvent, IEventLogger } from './index';
import { EventLogService } from './event_log_service';
import { getEsNames } from './es/names';
import { createMockEsContext } from './es/context.mock';
import { loggingServiceMock } from '../../../../src/core/server/logging/logging_service.mock';
import { delay } from './lib/delay';

const loggingService = loggingServiceMock.create();
const systemLogger = loggingService.get();

describe('EventLogger', () => {
  const esContext = createMockEsContext({ esNames: getEsNames('ABC'), logger: systemLogger });
  const config = { enabled: true, logEntries: true, indexEntries: true };
  const service = new EventLogService({ esContext, systemLogger, config });
  let eventLogger: IEventLogger;

  beforeEach(() => {
    eventLogger = service.getLogger({});
  });

  test('logEvent()', () => {
    service.registerProviderActions('test-provider', ['test-action-1']);
    const initialProperties = {
      event: { provider: 'test-provider' },
    };
    eventLogger = service.getLogger(initialProperties);

    // ATM, just make sure it doesn't blow up
    eventLogger.logEvent({});
  });

  test('timing', async () => {
    const event: IEvent = {};
    eventLogger.startTiming(event);

    const timeStart = event.event!.start!;
    expect(timeStart).toBeTruthy();
    expect(new Date(timeStart)).toBeTruthy();

    await delay(100);
    eventLogger.stopTiming(event);

    const timeStop = event.event!.end!;
    expect(timeStop).toBeTruthy();
    expect(new Date(timeStop)).toBeTruthy();

    const duration = event.event!.duration!;
    expect(duration).toBeGreaterThan(90 * 1000 * 1000);
  });

  test('timing - no start', async () => {
    const event: IEvent = {};
    eventLogger.stopTiming(event);

    expect(event.event).toBeUndefined();
  });

  test('timing - bad start', async () => {
    const event: IEvent = {
      event: {
        start: 'not a date that can be parsed',
      },
    };
    eventLogger.stopTiming(event);

    expect(event.event!.end).toBeUndefined();
    expect(event.event!.duration).toBeUndefined();
  });
});
