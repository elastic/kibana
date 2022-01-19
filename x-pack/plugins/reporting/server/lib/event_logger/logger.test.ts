/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ConcreteTaskInstance } from '../../../../task_manager/server';
import { eventLogServiceMock } from '../../../../event_log/server/mocks';
import { BasePayload } from '../../types';
import { Report } from '../store';
import { ReportingEventLogger, reportingEventLoggerFactory } from './logger';

describe('Event Logger', () => {
  const mockReport = new Report({
    _id: '12348',
    payload: { browserTimezone: 'UTC' } as BasePayload,
    jobtype: 'csv',
  });

  let factory: ReportingEventLogger;

  beforeEach(() => {
    factory = reportingEventLoggerFactory(eventLogServiceMock.create());
  });

  it(`should construct with an internal seed object`, () => {
    const logger = new factory(mockReport);
    expect(logger.eventObj).toMatchInlineSnapshot(`
      Object {
        "event": Object {
          "provider": "reporting",
          "timezone": "UTC",
        },
        "kibana": Object {
          "reporting": Object {
            "id": "12348",
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
    const logger = new factory(new Report({ ...mockReport, created_by: 'thundercat' }));
    expect(logger.eventObj).toMatchInlineSnapshot(`
      Object {
        "event": Object {
          "provider": "reporting",
          "timezone": "UTC",
        },
        "kibana": Object {
          "reporting": Object {
            "id": "12348",
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

  it(`allows optional task.id`, () => {
    const logger = new factory(new Report({ ...mockReport, created_by: 'thundercat' }), {
      id: 'some-task-id-123',
    } as ConcreteTaskInstance);
    expect(logger.eventObj).toMatchInlineSnapshot(`
      Object {
        "event": Object {
          "provider": "reporting",
          "timezone": "UTC",
        },
        "kibana": Object {
          "reporting": Object {
            "id": "12348",
            "jobType": "csv",
          },
          "task": Object {
            "id": "some-task-id-123",
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

  it(`logExecutionStart`, () => {
    const logger = new factory(mockReport);
    const result = logger.logExecutionStart();
    expect([result.event, result.kibana.reporting, result.message]).toMatchInlineSnapshot(`
      Array [
        Object {
          "action": "execute-start",
          "kind": "event",
          "provider": "reporting",
          "timezone": "UTC",
        },
        Object {
          "id": "12348",
          "jobType": "csv",
        },
        "starting csv execution",
      ]
    `);
    expect(result.message).toMatchInlineSnapshot(`"starting csv execution"`);
    expect(logger.completionLogger.startTiming).toBeCalled();
  });

  it(`logExecutionComplete`, () => {
    const logger = new factory(mockReport);
    logger.logExecutionStart();

    const result = logger.logExecutionComplete({ byteSize: 444 });
    expect([result.event, result.kibana.reporting, result.message]).toMatchInlineSnapshot(`
      Array [
        Object {
          "action": "execute-complete",
          "kind": "metrics",
          "outcome": "success",
          "provider": "reporting",
          "timezone": "UTC",
        },
        Object {
          "byteSize": 444,
          "id": "12348",
          "jobType": "csv",
        },
        "completed csv execution",
      ]
    `);
    expect(result.message).toMatchInlineSnapshot(`"completed csv execution"`);
    expect(logger.completionLogger.startTiming).toBeCalled();
    expect(logger.completionLogger.stopTiming).toBeCalled();
  });

  it(`logError`, () => {
    const logger = new factory(mockReport);
    const result = logger.logError(new Error('an error occurred'));
    expect([result.event, result.kibana.reporting, result.message]).toMatchInlineSnapshot(`
      Array [
        Object {
          "action": "execute-complete",
          "kind": "error",
          "outcome": "failure",
          "provider": "reporting",
          "timezone": "UTC",
        },
        Object {
          "id": "12348",
          "jobType": "csv",
        },
        "an error occurred",
      ]
    `);
    expect(result.message).toBe(`an error occurred`);
  });

  it(`logClaimTask`, () => {
    const logger = new factory(mockReport);
    const result = logger.logClaimTask();
    expect([result.event, result.kibana.reporting, result.message]).toMatchInlineSnapshot(`
      Array [
        Object {
          "action": "claim-task",
          "kind": "event",
          "provider": "reporting",
          "timezone": "UTC",
        },
        Object {
          "id": "12348",
          "jobType": "csv",
        },
        "claimed report 12348",
      ]
    `);
  });

  it(`logReportFailure`, () => {
    const logger = new factory(mockReport);
    const result = logger.logReportFailure();
    expect([result.event, result.kibana.reporting, result.message]).toMatchInlineSnapshot(`
      Array [
        Object {
          "action": "fail-report",
          "kind": "event",
          "provider": "reporting",
          "timezone": "UTC",
        },
        Object {
          "id": "12348",
          "jobType": "csv",
        },
        "report 12348 has failed",
      ]
    `);
  });
  it(`logReportSaved`, () => {
    const logger = new factory(mockReport);
    const result = logger.logReportSaved();
    expect([result.event, result.kibana.reporting, result.message]).toMatchInlineSnapshot(`
      Array [
        Object {
          "action": "save-report",
          "kind": "event",
          "provider": "reporting",
          "timezone": "UTC",
        },
        Object {
          "id": "12348",
          "jobType": "csv",
        },
        "saved report 12348",
      ]
    `);
  });
  it(`logRetry`, () => {
    const logger = new factory(mockReport);
    const result = logger.logRetry();
    expect([result.event, result.kibana.reporting, result.message]).toMatchInlineSnapshot(`
      Array [
        Object {
          "action": "retry",
          "kind": "event",
          "provider": "reporting",
          "timezone": "UTC",
        },
        Object {
          "id": "12348",
          "jobType": "csv",
        },
        "scheduled retry for report 12348",
      ]
    `);
  });
});
