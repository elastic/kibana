/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from 'src/core/server/mocks';
import { ConcreteTaskInstance } from '../../../../task_manager/server';
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
    factory = reportingEventLoggerFactory(loggingSystemMock.createLogger());
  });

  it(`should construct with an internal seed object`, () => {
    const logger = new factory(mockReport);
    expect(logger.eventObj).toMatchInlineSnapshot(`
      Object {
        "event": Object {
          "timezone": "UTC",
        },
        "kibana": Object {
          "reporting": Object {
            "id": "12348",
            "jobType": "csv",
          },
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
          "timezone": "UTC",
        },
        "kibana": Object {
          "reporting": Object {
            "id": "12348",
            "jobType": "csv",
          },
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
        "user": Object {
          "name": "thundercat",
        },
      }
    `);
  });

  it(`logExecutionStart`, () => {
    const logger = new factory(mockReport);
    jest.spyOn(logger.completionLogger, 'startTiming');
    jest.spyOn(logger.completionLogger, 'stopTiming');
    const result = logger.logExecutionStart();
    expect([result.event, result.kibana.reporting, result.message]).toMatchInlineSnapshot(`
      Array [
        Object {
          "timezone": "UTC",
        },
        Object {
          "actionType": "execute-start",
          "id": "12348",
          "jobType": "csv",
        },
        "starting csv execution",
      ]
    `);
    expect(result.message).toMatchInlineSnapshot(`"starting csv execution"`);
    expect(logger.completionLogger.startTiming).toBeCalled();
    expect(logger.completionLogger.stopTiming).not.toBeCalled();
  });

  it(`logExecutionComplete`, () => {
    const logger = new factory(mockReport);
    jest.spyOn(logger.completionLogger, 'startTiming');
    jest.spyOn(logger.completionLogger, 'stopTiming');
    logger.logExecutionStart();

    const result = logger.logExecutionComplete({
      byteSize: 444,
      pdf: {
        cpu: 0.1,
        memory: 1024,
        pages: 5,
      },
    });
    expect([result.event, result.kibana.reporting, result.message]).toMatchInlineSnapshot(`
      Array [
        Object {
          "timezone": "UTC",
        },
        Object {
          "actionType": "execute-complete",
          "byteSize": 444,
          "csv": undefined,
          "id": "12348",
          "jobType": "csv",
          "pdf": Object {
            "cpu": 0.1,
            "memory": 1024,
            "pages": 5,
          },
          "png": undefined,
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
          "timezone": "UTC",
        },
        Object {
          "actionType": "execute-error",
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
    const result = logger.logClaimTask({ queueDuration: 5500 });
    expect([result.event, result.kibana.reporting, result.message]).toMatchInlineSnapshot(`
      Array [
        Object {
          "duration": 5500,
          "timezone": "UTC",
        },
        Object {
          "actionType": "claim-task",
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
          "timezone": "UTC",
        },
        Object {
          "actionType": "fail-report",
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
          "timezone": "UTC",
        },
        Object {
          "actionType": "save-report",
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
          "timezone": "UTC",
        },
        Object {
          "actionType": "retry",
          "id": "12348",
          "jobType": "csv",
        },
        "scheduled retry for report 12348",
      ]
    `);
  });
});
