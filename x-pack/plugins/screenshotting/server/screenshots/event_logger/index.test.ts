/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import { Actions, EventLogger } from '.';
import { ElementPosition } from '../get_element_position_data';

describe('Event Logger', () => {
  let eventLogger: EventLogger;

  beforeEach(() => {
    const testDate = moment(new Date('2021-04-12T16:00:00.000Z'));
    let delaySeconds = 1;
    jest.spyOn(global.Date, 'now').mockImplementation(() => {
      return testDate.add(delaySeconds++, 'seconds').valueOf();
    });

    eventLogger = new EventLogger(loggingSystemMock.createLogger());
  });

  it('creates logs for the events and includes durations and event payload data', () => {
    const logs = [];
    logs.push(eventLogger.screenshottingStart());
    logs.push(eventLogger.openUrlStart());
    logs.push(eventLogger.openUrlEnd());
    logs.push(eventLogger.getElementPositionsStart());
    logs.push(eventLogger.getElementPositionsEnd({ elementPositions: 44 }));

    logs.push(eventLogger.getNumberOfItemsStart());
    logs.push(eventLogger.getNumberOfItemsEnd({ itemsCount: 3 }));
    logs.push(eventLogger.getRenderErrorsStart());
    logs.push(eventLogger.getRenderErrorsEnd({ renderErrors: 0 }));
    logs.push(eventLogger.getTimeRangeStart());
    logs.push(eventLogger.getTimeRangeEnd());
    logs.push(eventLogger.injectCssStart());
    logs.push(eventLogger.injectCssEnd());
    logs.push(eventLogger.positionElementsStart());
    logs.push(eventLogger.positionElementsEnd());
    logs.push(eventLogger.waitForRenderStart());
    logs.push(eventLogger.waitForRenderEnd());
    logs.push(eventLogger.pdfStart());
    logs.push(eventLogger.addPdfImageStart());
    logs.push(eventLogger.addPdfImageEnd());
    logs.push(eventLogger.compilePdfStart());
    logs.push(eventLogger.compilePdfEnd());
    logs.push(eventLogger.pdfEnd({ pdfPages: 1, byteLengthPdf: 6666 }));

    const logData = logs.map((log) => ({
      event: log.kibana.screenshotting.action,
      duration: log.event?.duration,
    }));
    expect(logData).toMatchInlineSnapshot(`
      Array [
        Object {
          "duration": undefined,
          "event": "screenshot-pipeline-start",
        },
        Object {
          "duration": undefined,
          "event": "open-url-start",
        },
        Object {
          "duration": 3000,
          "event": "open-url-complete",
        },
        Object {
          "duration": undefined,
          "event": "get-element-position-data-start",
        },
        Object {
          "duration": 5000,
          "event": "get-element-position-data-complete",
        },
        Object {
          "duration": undefined,
          "event": "get-number-of-items-start",
        },
        Object {
          "duration": 7000,
          "event": "get-number-of-items-complete",
        },
        Object {
          "duration": undefined,
          "event": "get-render-errors-start",
        },
        Object {
          "duration": 9000,
          "event": "get-render-errors-complete",
        },
        Object {
          "duration": undefined,
          "event": "get-timerange-start",
        },
        Object {
          "duration": 11000,
          "event": "get-timerange-complete",
        },
        Object {
          "duration": undefined,
          "event": "inject-css-start",
        },
        Object {
          "duration": 13000,
          "event": "inject-css-complete",
        },
        Object {
          "duration": undefined,
          "event": "position-elements-start",
        },
        Object {
          "duration": 15000,
          "event": "position-elements-complete",
        },
        Object {
          "duration": undefined,
          "event": "wait-for-render-start",
        },
        Object {
          "duration": 17000,
          "event": "wait-for-render-complete",
        },
        Object {
          "duration": undefined,
          "event": "generate-pdf-start",
        },
        Object {
          "duration": undefined,
          "event": "add-pdf-image-start",
        },
        Object {
          "duration": 20000,
          "event": "add-pdf-image-complete",
        },
        Object {
          "duration": undefined,
          "event": "compile-pdf-start",
        },
        Object {
          "duration": 22000,
          "event": "compile-pdf-complete",
        },
        Object {
          "duration": 105000,
          "event": "generate-pdf-complete",
        },
      ]
    `);
  });

  it('logs number of pixels', () => {
    const logs = [];
    const elementPosition = {
      zoom: 2,
      boundingClientRect: { width: 1350, height: 2000 },
      scroll: {},
    } as ElementPosition;
    logs.push(eventLogger.getScreenshotStart({ current: 1, total: 1, elementPosition }));
    logs.push(
      eventLogger.getScreenshotEnd({ byteLength: 4444, current: 1, total: 1, elementPosition })
    );

    const logData = logs.map((log) => ({
      message: log.message,
      duration: log.event?.duration,
      screenshotting: log.kibana.screenshotting,
    }));

    expect(
      logData.map((l) => ({
        duration: l.duration,
        message: l.message,
        action: l.screenshotting.action,
        byte_length: l.screenshotting.byte_length,
        pixels: l.screenshotting.pixels,
      }))
    ).toMatchInlineSnapshot(`
      Array [
        Object {
          "action": "get-screenshots-start",
          "byte_length": undefined,
          "duration": undefined,
          "message": "capturing single screenshot",
          "pixels": 10800000,
        },
        Object {
          "action": "get-screenshots-complete",
          "byte_length": 4444,
          "duration": 2000,
          "message": "single screenshot captured",
          "pixels": 10800000,
        },
      ]
    `);
  });

  it('creates helpful error logs', () => {
    const logs = [];
    logs.push(eventLogger.screenshottingStart());
    logs.push(eventLogger.error(new Error('Something erroneous happened'), Actions.SCREENSHOTTING));

    const logData = logs.map((log) => ({
      action: log.kibana.screenshotting.action,
      message: log.message,
      error: log.error,
    }));
    expect(logData).toMatchInlineSnapshot(`
      Array [
        Object {
          "action": "screenshot-pipeline-start",
          "error": undefined,
          "message": "screenshot-pipeline starting",
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
