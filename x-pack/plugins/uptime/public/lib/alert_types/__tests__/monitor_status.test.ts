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
        locations: [],
        numTimes: 5,
        timerange: {
          from: 'now-15m',
          to: 'now',
        },
      };
    });

    it(`doesn't throw on empty set`, () => {
      expect(validate({})).toMatchInlineSnapshot(`
        Object {
          "errors": Object {
            "typeCheckFailure": "Provided parameters do not conform to the expected type.",
            "typeCheckParsingMessage": Array [
              "Invalid value undefined supplied to : (Partial<{ filters: string }> & { locations: Array<string>, numTimes: number, timerange: { from: string, to: string } })/1: { locations: Array<string>, numTimes: number, timerange: { from: string, to: string } }/locations: Array<string>",
              "Invalid value undefined supplied to : (Partial<{ filters: string }> & { locations: Array<string>, numTimes: number, timerange: { from: string, to: string } })/1: { locations: Array<string>, numTimes: number, timerange: { from: string, to: string } }/numTimes: number",
              "Invalid value undefined supplied to : (Partial<{ filters: string }> & { locations: Array<string>, numTimes: number, timerange: { from: string, to: string } })/1: { locations: Array<string>, numTimes: number, timerange: { from: string, to: string } }/timerange: { from: string, to: string }",
            ],
          },
        }
      `);
    });

    describe('timerange', () => {
      it('is undefined', () => {
        delete params.timerange;
        expect(validate(params)).toMatchInlineSnapshot(`
          Object {
            "errors": Object {
              "typeCheckFailure": "Provided parameters do not conform to the expected type.",
              "typeCheckParsingMessage": Array [
                "Invalid value undefined supplied to : (Partial<{ filters: string }> & { locations: Array<string>, numTimes: number, timerange: { from: string, to: string } })/1: { locations: Array<string>, numTimes: number, timerange: { from: string, to: string } }/timerange: { from: string, to: string }",
              ],
            },
          }
        `);
      });

      it('is missing `from` or `to` value', () => {
        expect(
          validate({
            ...params,
            timerange: {},
          })
        ).toMatchInlineSnapshot(`
          Object {
            "errors": Object {
              "typeCheckFailure": "Provided parameters do not conform to the expected type.",
              "typeCheckParsingMessage": Array [
                "Invalid value undefined supplied to : (Partial<{ filters: string }> & { locations: Array<string>, numTimes: number, timerange: { from: string, to: string } })/1: { locations: Array<string>, numTimes: number, timerange: { from: string, to: string } }/timerange: { from: string, to: string }/from: string",
                "Invalid value undefined supplied to : (Partial<{ filters: string }> & { locations: Array<string>, numTimes: number, timerange: { from: string, to: string } })/1: { locations: Array<string>, numTimes: number, timerange: { from: string, to: string } }/timerange: { from: string, to: string }/to: string",
              ],
            },
          }
        `);
      });

      it('is invalid timespan', () => {
        expect(
          validate({
            ...params,
            timerange: {
              from: 'now',
              to: 'now-15m',
            },
          })
        ).toMatchInlineSnapshot(`
            Object {
              "errors": Object {
                "invalidTimeRange": "Time range start cannot exceed time range end",
              },
            }
          `);
      });

      it('has unparseable `from` value', () => {
        expect(
          validate({
            ...params,
            timerange: {
              from: 'cannot parse this to a date',
              to: 'now',
            },
          })
        ).toMatchInlineSnapshot(`
          Object {
            "errors": Object {
              "timeRangeStartValueNaN": "Specified time range \`from\` is an invalid value",
            },
          }
        `);
      });

      it('has unparseable `to` value', () => {
        expect(
          validate({
            ...params,
            timerange: {
              from: 'now-15m',
              to: 'cannot parse this to a date',
            },
          })
        ).toMatchInlineSnapshot(`
          Object {
            "errors": Object {
              "timeRangeEndValueNaN": "Specified time range \`to\` is an invalid value",
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
                "Invalid value undefined supplied to : (Partial<{ filters: string }> & { locations: Array<string>, numTimes: number, timerange: { from: string, to: string } })/1: { locations: Array<string>, numTimes: number, timerange: { from: string, to: string } }/numTimes: number",
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
                "Invalid value \\"this isn't a number\\" supplied to : (Partial<{ filters: string }> & { locations: Array<string>, numTimes: number, timerange: { from: string, to: string } })/1: { locations: Array<string>, numTimes: number, timerange: { from: string, to: string } }/numTimes: number",
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
        "name": "Uptime monitor status",
        "validate": [Function],
      }
    `);
  });
});
