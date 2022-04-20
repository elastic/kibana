/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { omit } from 'lodash';
import moment from 'moment';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import { Actions, EventLogger, ScreenshottingAction } from '.';
import { ElementPosition } from '../get_element_position_data';
import { ConfigType } from '../../config';

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
      event: data.kibana.screenshotting.action,
      duration: data?.event?.duration,
    }));

    expect(logs).toMatchInlineSnapshot(`
      Array [
        Object {
          "duration": undefined,
          "event": "screenshot-pipeline-start",
          "message": "screenshot pipeline - starting",
        },
        Object {
          "duration": undefined,
          "event": "open-url-start",
          "message": "open the url to the Kibana application - starting",
        },
        Object {
          "duration": 3000,
          "event": "open-url-complete",
          "message": "open the url to the Kibana application - completed",
        },
        Object {
          "duration": undefined,
          "event": "get-element-position-data-start",
          "message": "scan the page to find the boundaries of visualization elements - starting",
        },
        Object {
          "duration": 5000,
          "event": "get-element-position-data-complete",
          "message": "scan the page to find the boundaries of visualization elements - completed",
        },
        Object {
          "duration": 20000,
          "event": "screenshot-pipeline-complete",
          "message": "screenshot pipeline - completed",
        },
        Object {
          "duration": undefined,
          "event": "generate-pdf-start",
          "message": "pdf generation - starting",
        },
        Object {
          "duration": undefined,
          "event": "add-pdf-image-start",
          "message": "add image to the PDF file - starting",
        },
        Object {
          "duration": 9000,
          "event": "add-pdf-image-complete",
          "message": "add image to the PDF file - completed",
        },
        Object {
          "duration": 27000,
          "event": "generate-pdf-complete",
          "message": "pdf generation - completed",
        },
      ]
    `);
  });

  it('logs the number of pixels', () => {
    const elementPosition = {
      boundingClientRect: { width: 1350, height: 2000 },
      scroll: {},
    } as ElementPosition;
    const endScreenshot = eventLogger.screenshot({ elementPosition });
    endScreenshot({ byteLength: 4444, elementPosition });

    const logData = logSpy.mock.calls.map(([message, data]) => ({
      message,
      duration: data.event?.duration,
      screenshotting: omit(data.kibana.screenshotting, 'session_id'),
    }));

    expect(logData).toMatchInlineSnapshot(`
      Array [
        Object {
          "duration": undefined,
          "message": "screenshot capture - starting",
          "screenshotting": Object {
            "action": "get-screenshots-start",
            "pixels": 10800000,
          },
        },
        Object {
          "duration": 2000,
          "message": "screenshot capture - completed",
          "screenshotting": Object {
            "action": "get-screenshots-complete",
            "byte_length": 4444,
            "pixels": 10800000,
          },
        },
      ]
    `);
  });

  it('creates helpful error logs', () => {
    eventLogger.screenshottingTransaction();
    eventLogger.error(new Error('Something erroneous happened'), Actions.SCREENSHOTTING);

    const logData = logSpy.mock.calls.map(([message, data]) => ({
      message,
      action: data.kibana.screenshotting.action,
      error: data.error,
    }));

    expect(logData).toMatchInlineSnapshot(`
      Array [
        Object {
          "action": "screenshot-pipeline-start",
          "error": undefined,
          "message": "screenshot pipeline - starting",
        },
        Object {
          "action": "screenshot-pipeline-error",
          "error": Object {
            "code": undefined,
            "message": "Something erroneous happened",
            "stack_trace": undefined,
            "type": undefined,
          },
          "message": "an error occurred",
        },
      ]
    `);
  });
});
