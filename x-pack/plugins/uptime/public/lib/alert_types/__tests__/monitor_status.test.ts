/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { validate, initMonitorStatusAlertType } from '../monitor_status';

describe('monitor status alert type', () => {
  describe('validate', () => {
    let params: any;

    beforeEach(() => {
      params = {
        numTimes: 5,
        timerangeCount: 15,
        timerangeUnit: 'm',
      };
    });

    it(`doesn't throw on empty set`, () => {
      expect(validate({})).toMatchInlineSnapshot(`
        Object {
          "errors": Object {
            "typeCheckFailure": "Provided parameters do not conform to the expected type.",
            "typeCheckParsingMessage": Array [
              "Invalid value undefined supplied to : ({ numTimes: number, timerangeCount: number, timerangeUnit: string } & Partial<{ search: string, filters: { monitor.type: Array<string>, observer.geo.name: Array<string>, tags: Array<string>, url.port: Array<string> } }>)/0: { numTimes: number, timerangeCount: number, timerangeUnit: string }/numTimes: number",
              "Invalid value undefined supplied to : ({ numTimes: number, timerangeCount: number, timerangeUnit: string } & Partial<{ search: string, filters: { monitor.type: Array<string>, observer.geo.name: Array<string>, tags: Array<string>, url.port: Array<string> } }>)/0: { numTimes: number, timerangeCount: number, timerangeUnit: string }/timerangeCount: number",
              "Invalid value undefined supplied to : ({ numTimes: number, timerangeCount: number, timerangeUnit: string } & Partial<{ search: string, filters: { monitor.type: Array<string>, observer.geo.name: Array<string>, tags: Array<string>, url.port: Array<string> } }>)/0: { numTimes: number, timerangeCount: number, timerangeUnit: string }/timerangeUnit: string",
            ],
          },
        }
      `);
    });

    describe('timerange', () => {
      it('has invalid timerangeCount value', () => {
        expect(validate({ ...params, timerangeCount: 0 })).toMatchInlineSnapshot(`
          Object {
            "errors": Object {
              "invalidTimeRangeValue": "Time range value must be greater than 0",
            },
          }
        `);
      });

      it('has NaN timerangeCount value', () => {
        expect(validate({ ...params, timerangeCount: NaN })).toMatchInlineSnapshot(`
          Object {
            "errors": Object {
              "timeRangeStartValueNaN": "Specified time range value must be a number",
            },
          }
        `);
      });
    });

    describe('numTimes', () => {
      it('is missing', () => {
        delete params.numTimes;
        expect(validate(params)).toMatchInlineSnapshot(`
          Object {
            "errors": Object {
              "typeCheckFailure": "Provided parameters do not conform to the expected type.",
              "typeCheckParsingMessage": Array [
                "Invalid value undefined supplied to : ({ numTimes: number, timerangeCount: number, timerangeUnit: string } & Partial<{ search: string, filters: { monitor.type: Array<string>, observer.geo.name: Array<string>, tags: Array<string>, url.port: Array<string> } }>)/0: { numTimes: number, timerangeCount: number, timerangeUnit: string }/numTimes: number",
              ],
            },
          }
        `);
      });

      it('is NaN', () => {
        expect(validate({ ...params, numTimes: `this isn't a number` })).toMatchInlineSnapshot(`
          Object {
            "errors": Object {
              "typeCheckFailure": "Provided parameters do not conform to the expected type.",
              "typeCheckParsingMessage": Array [
                "Invalid value \\"this isn't a number\\" supplied to : ({ numTimes: number, timerangeCount: number, timerangeUnit: string } & Partial<{ search: string, filters: { monitor.type: Array<string>, observer.geo.name: Array<string>, tags: Array<string>, url.port: Array<string> } }>)/0: { numTimes: number, timerangeCount: number, timerangeUnit: string }/numTimes: number",
              ],
            },
          }
        `);
      });

      it('is less than 1', () => {
        expect(validate({ ...params, numTimes: 0 })).toMatchInlineSnapshot(`
          Object {
            "errors": Object {
              "invalidNumTimes": "Number of alert check down times must be an integer greater than 0",
            },
          }
        `);
      });
    });
  });

  describe('initMonitorStatusAlertType', () => {
    expect(initMonitorStatusAlertType({ autocomplete: {} })).toMatchInlineSnapshot(`
      Object {
        "alertParamsExpression": [Function],
        "defaultActionMessage": "{{context.message}}
      Last triggered at: {{state.lastTriggeredAt}}
      {{context.downMonitorsWithGeo}}",
        "iconClass": "uptimeApp",
        "id": "xpack.uptime.alerts.monitorStatus",
        "name": <MonitorStatusTitle />,
        "requiresAppContext": true,
        "validate": [Function],
      }
    `);
  });
});
