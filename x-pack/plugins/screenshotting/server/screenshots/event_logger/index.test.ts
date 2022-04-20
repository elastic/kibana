/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import { Actions, EventLogger, ScreenshottingAction } from '.';
import { ElementPosition } from '../get_element_position_data';
import { ConfigType } from '../../config';

jest.mock('uuid', () => ({
  v4: () => 'NEW_UUID',
}));

type EventLoggerArgs = [message: string, meta: ScreenshottingAction];
describe('Event Logger', () => {
  let eventLogger: EventLogger;
  let config: ConfigType;
  let logSpy: jest.SpyInstance<void, EventLoggerArgs>;

  beforeEach(() => {
    const testDate = moment(new Date('2021-04-12T16:00:00.000Z'));
    let delaySeconds = 1;

    jest.spyOn(global.Date, 'now').mockImplementation(() => {
      return testDate.add(delaySeconds++, 'seconds').valueOf();
    });

    const logger = loggingSystemMock.createLogger();
    config = { capture: { zoom: 2 } } as ConfigType;
    eventLogger = new EventLogger(logger, config);

    logSpy = jest.spyOn(logger, 'debug') as jest.SpyInstance<void, EventLoggerArgs>;
  });

  it('creates logs for the events and includes durations and event payload data', () => {
    const screenshottingEnd = eventLogger.screenshottingTransaction();
    const openUrlEnd = eventLogger.log(
      'open the url to the Kibana application',
      Actions.OPEN_URL,
      'screenshotting',
      'wait'
    );
    openUrlEnd();
    const getElementPositionsEnd = eventLogger.log(
      'scan the page to find the boundaries of visualization elements',
      Actions.GET_ELEMENT_POSITION_DATA,
      'screenshotting',
      'wait'
    );
    getElementPositionsEnd();
    screenshottingEnd({
      metrics: { cpu: 12, cpuInPercentage: 0, memory: 450789, memoryInMegabytes: 449 },
      results: [],
    });

    const pdfEnd = eventLogger.pdfTransaction();
    const addImageEnd = eventLogger.log(
      'add image to the PDF file',
      Actions.ADD_IMAGE,
      'generatePdf',
      'output'
    );
    addImageEnd();
    pdfEnd({ pdf_pages: 1, byte_length_pdf: 6666 });

    const logs = logSpy.mock.calls.map(([message, data]) => ({
      message,
      duration: data?.event?.duration,
      screenshotting: data?.kibana?.screenshotting,
    }));

    expect(logs).toMatchInlineSnapshot(`
      Array [
        Object {
          "duration": undefined,
          "message": "starting: screenshot pipeline",
          "screenshotting": Object {
            "action": "screenshot-pipeline-start",
            "session_id": "NEW_UUID",
          },
        },
        Object {
          "duration": undefined,
          "message": "starting: open the url to the Kibana application",
          "screenshotting": Object {
            "action": "open-url-start",
            "session_id": "NEW_UUID",
          },
        },
        Object {
          "duration": 3000,
          "message": "completed: open the url to the Kibana application",
          "screenshotting": Object {
            "action": "open-url-complete",
            "session_id": "NEW_UUID",
          },
        },
        Object {
          "duration": undefined,
          "message": "starting: scan the page to find the boundaries of visualization elements",
          "screenshotting": Object {
            "action": "get-element-position-data-start",
            "session_id": "NEW_UUID",
          },
        },
        Object {
          "duration": 5000,
          "message": "completed: scan the page to find the boundaries of visualization elements",
          "screenshotting": Object {
            "action": "get-element-position-data-complete",
            "session_id": "NEW_UUID",
          },
        },
        Object {
          "duration": 20000,
          "message": "completed: screenshot pipeline",
          "screenshotting": Object {
            "action": "screenshot-pipeline-complete",
            "byte_length": 0,
            "cpu": 12,
            "memory": 450789,
            "session_id": "NEW_UUID",
          },
        },
        Object {
          "duration": undefined,
          "message": "starting: pdf generation",
          "screenshotting": Object {
            "action": "generate-pdf-start",
            "session_id": "NEW_UUID",
          },
        },
        Object {
          "duration": undefined,
          "message": "starting: add image to the PDF file",
          "screenshotting": Object {
            "action": "add-pdf-image-start",
            "session_id": "NEW_UUID",
          },
        },
        Object {
          "duration": 9000,
          "message": "completed: add image to the PDF file",
          "screenshotting": Object {
            "action": "add-pdf-image-complete",
            "session_id": "NEW_UUID",
          },
        },
        Object {
          "duration": 27000,
          "message": "completed: pdf generation",
          "screenshotting": Object {
            "action": "generate-pdf-complete",
            "byte_length_pdf": 6666,
            "pdf_pages": 1,
            "session_id": "NEW_UUID",
          },
        },
      ]
    `);
  });

  it('logs the number of pixels', () => {
    const elementPosition = {
      boundingClientRect: { width: 1350, height: 2000 },
      scroll: {},
    } as ElementPosition;
    const endScreenshot = eventLogger.startScreenshot({ elementPosition });
    endScreenshot({ byteLength: 4444, elementPosition });

    const logData = logSpy.mock.calls.map(([message, data]) => ({
      message,
      duration: data.event?.duration,
      screenshotting: data.kibana.screenshotting,
    }));

    expect(logData).toMatchInlineSnapshot(`
      Array [
        Object {
          "duration": undefined,
          "message": "starting: screenshot capture",
          "screenshotting": Object {
            "action": "get-screenshots-start",
            "pixels": 10800000,
            "session_id": "NEW_UUID",
          },
        },
        Object {
          "duration": 2000,
          "message": "completed: screenshot capture",
          "screenshotting": Object {
            "action": "get-screenshots-complete",
            "byte_length": 4444,
            "pixels": 10800000,
            "session_id": "NEW_UUID",
          },
        },
      ]
    `);
  });

  it('creates helpful error logs', () => {
    eventLogger.screenshottingTransaction();
    eventLogger.log('opening the url', Actions.OPEN_URL, 'screenshotting', 'wait');
    eventLogger.error(new Error('Something erroneous happened'), Actions.SCREENSHOTTING);

    const logData = logSpy.mock.calls.map(([message, data]) => ({
      message,
      error: data.error,
      screenshotting: data.kibana.screenshotting,
    }));

    expect(logData).toMatchInlineSnapshot(`
      Array [
        Object {
          "error": undefined,
          "message": "starting: screenshot pipeline",
          "screenshotting": Object {
            "action": "screenshot-pipeline-start",
            "session_id": "NEW_UUID",
          },
        },
        Object {
          "error": undefined,
          "message": "starting: opening the url",
          "screenshotting": Object {
            "action": "open-url-start",
            "session_id": "NEW_UUID",
          },
        },
        Object {
          "error": Object {
            "code": undefined,
            "message": "Something erroneous happened",
            "stack_trace": undefined,
            "type": undefined,
          },
          "message": "Error: Something erroneous happened",
          "screenshotting": Object {
            "action": "screenshot-pipeline-error",
            "session_id": "NEW_UUID",
          },
        },
      ]
    `);
  });
});
