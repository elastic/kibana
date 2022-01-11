/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { eventLogServiceMock } from '../../../../event_log/server/mocks';
import {
  ReportingEventLogger,
  reportingEventLoggerFactory,
  ReportingEventLoggerOpts,
} from './logger';

describe('Event Logger', () => {
  const mockEventObject: ReportingEventLoggerOpts = {
    event: { timezone: 'UTC' },
    kibana: { reporting: { id: '12348', jobType: 'csv' } },
  };

  let factory: ReportingEventLogger;

  beforeEach(() => {
    factory = reportingEventLoggerFactory(eventLogServiceMock.create());
  });

  it(`should construct with an internal seed object`, () => {
    const logger = new factory(mockEventObject);
    expect(logger.eventObj).toMatchInlineSnapshot(`
      Object {
        "event": Object {
          "id": "12348",
          "provider": "reporting",
          "timezone": "UTC",
        },
        "kibana": Object {
          "reporting": Object {
            "jobType": "csv",
          },
        },
        "log": Object {
          "logger": "reporting",
        },
        "user": undefined,
      }
    `);
  });

  it(`allows optional user name`, () => {
    const logger = new factory({ ...mockEventObject, user: { name: 'thundercat' } });
    expect(logger.eventObj).toMatchInlineSnapshot(`
      Object {
        "event": Object {
          "id": "12348",
          "provider": "reporting",
          "timezone": "UTC",
        },
        "kibana": Object {
          "reporting": Object {
            "jobType": "csv",
          },
        },
        "log": Object {
          "logger": "reporting",
        },
        "user": Object {
          "name": "thundercat",
        },
      }
    `);
  });

  it(`logExecutionStart should create a 'start' event`, () => {
    const logger = new factory(mockEventObject);
    const result = logger.logExecutionStart('starting the event');
    expect(result.event).toMatchInlineSnapshot(`
      Object {
        "action": "execute-start",
        "id": "12348",
        "kind": "event",
        "provider": "reporting",
        "timezone": "UTC",
      }
    `);
    expect(result.message).toBe(`starting the event`);
    expect(logger.completionLogger.startTiming).toBeCalled();
  });

  it(`logExecutionComplete should create a 'complete' event`, () => {
    const logger = new factory(mockEventObject);
    logger.logExecutionStart('starting the event');

    const result = logger.logExecutionComplete('completed the event', 444);
    expect(result.event).toMatchInlineSnapshot(`
      Object {
        "action": "execute-complete",
        "id": "12348",
        "kind": "metrics",
        "outcome": "success",
        "provider": "reporting",
        "timezone": "UTC",
      }
    `);
    expect(result.kibana.reporting).toMatchInlineSnapshot(`
      Object {
        "byteSize": 444,
        "jobType": "csv",
      }
    `);
    expect(result.message).toBe(`completed the event`);
    expect(logger.completionLogger.startTiming).toBeCalled();
    expect(logger.completionLogger.stopTiming).toBeCalled();
  });

  it(`logError should create an 'error' event`, () => {
    const logger = new factory(mockEventObject);
    const result = logger.logError(new Error('an error occurred'));
    expect(result.event).toMatchInlineSnapshot(`
      Object {
        "action": "execute-complete",
        "id": "12348",
        "kind": "error",
        "outcome": "failure",
        "provider": "reporting",
        "timezone": "UTC",
      }
    `);
    expect(result.message).toBe(`an error occurred`);
  });
});
