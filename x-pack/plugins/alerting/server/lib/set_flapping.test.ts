/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { pick } from 'lodash';
import { Alert } from '../alert';
import { AlertInstanceState, AlertInstanceContext, DefaultActionGroupId } from '../../common';
import { setFlapping, isAlertFlapping } from './set_flapping';

describe('setFlapping', () => {
  const flapping = new Array(16).fill(false).concat([true, true, true, true]);
  const notFlapping = new Array(20).fill(false);

  test('should set flapping on alerts', () => {
    const activeAlerts = {
      '1': new Alert('1', { meta: { flappingHistory: flapping } }),
      '2': new Alert('2', { meta: { flappingHistory: [false, false] } }),
      '3': new Alert('3', { meta: { flapping: true, flappingHistory: flapping } }),
      '4': new Alert('4', { meta: { flapping: true, flappingHistory: [false, false] } }),
    };

    const recoveredAlerts = {
      '1': new Alert('1', { meta: { flappingHistory: [true, true, true, true] } }),
      '2': new Alert('2', { meta: { flappingHistory: notFlapping } }),
      '3': new Alert('3', { meta: { flapping: true, flappingHistory: [true, true] } }),
      '4': new Alert('4', { meta: { flapping: true, flappingHistory: notFlapping } }),
    };

    setFlapping(activeAlerts, recoveredAlerts);
    const fields = ['1.meta.flapping', '2.meta.flapping', '3.meta.flapping', '4.meta.flapping'];
    expect(pick(activeAlerts, fields)).toMatchInlineSnapshot(`
      Object {
        "1": Object {
          "meta": Object {
            "flapping": true,
          },
        },
        "2": Object {
          "meta": Object {
            "flapping": false,
          },
        },
        "3": Object {
          "meta": Object {
            "flapping": true,
          },
        },
        "4": Object {
          "meta": Object {
            "flapping": true,
          },
        },
      }
    `);
    expect(pick(recoveredAlerts, fields)).toMatchInlineSnapshot(`
      Object {
        "1": Object {
          "meta": Object {
            "flapping": true,
          },
        },
        "2": Object {
          "meta": Object {
            "flapping": false,
          },
        },
        "3": Object {
          "meta": Object {
            "flapping": true,
          },
        },
        "4": Object {
          "meta": Object {
            "flapping": false,
          },
        },
      }
    `);
  });

  describe('isAlertFlapping', () => {
    describe('not currently flapping', () => {
      test('returns true if the flap count exceeds the threshold', () => {
        const flappingHistory = [true, true, true, true].concat(new Array(16).fill(false));
        const alert = new Alert<AlertInstanceState, AlertInstanceContext, DefaultActionGroupId>(
          '1',
          {
            meta: { flappingHistory },
          }
        );
        expect(isAlertFlapping(alert)).toEqual(true);
      });

      test("returns false the flap count doesn't exceed the threshold", () => {
        const flappingHistory = [true, true].concat(new Array(20).fill(false));
        const alert = new Alert<AlertInstanceState, AlertInstanceContext, DefaultActionGroupId>(
          '1',
          {
            meta: { flappingHistory },
          }
        );
        expect(isAlertFlapping(alert)).toEqual(false);
      });

      test('returns true if not at capacity and the flap count exceeds the threshold', () => {
        const flappingHistory = new Array(5).fill(true);
        const alert = new Alert<AlertInstanceState, AlertInstanceContext, DefaultActionGroupId>(
          '1',
          {
            meta: { flappingHistory },
          }
        );
        expect(isAlertFlapping(alert)).toEqual(true);
      });
    });

    describe('currently flapping', () => {
      test('returns true if at capacity and the flap count exceeds the threshold', () => {
        const flappingHistory = new Array(16).fill(false).concat([true, true, true, true]);
        const alert = new Alert<AlertInstanceState, AlertInstanceContext, DefaultActionGroupId>(
          '1',
          {
            meta: { flappingHistory, flapping: true },
          }
        );
        expect(isAlertFlapping(alert)).toEqual(true);
      });

      test("returns true if not at capacity and the flap count doesn't exceed the threshold", () => {
        const flappingHistory = new Array(16).fill(false);
        const alert = new Alert<AlertInstanceState, AlertInstanceContext, DefaultActionGroupId>(
          '1',
          {
            meta: { flappingHistory, flapping: true },
          }
        );
        expect(isAlertFlapping(alert)).toEqual(true);
      });

      test('returns true if not at capacity and the flap count exceeds the threshold', () => {
        const flappingHistory = new Array(10).fill(false).concat([true, true, true, true]);
        const alert = new Alert<AlertInstanceState, AlertInstanceContext, DefaultActionGroupId>(
          '1',
          {
            meta: { flappingHistory, flapping: true },
          }
        );
        expect(isAlertFlapping(alert)).toEqual(true);
      });

      test("returns false if at capacity and the flap count doesn't exceed the threshold", () => {
        const flappingHistory = new Array(20).fill(false);
        const alert = new Alert<AlertInstanceState, AlertInstanceContext, DefaultActionGroupId>(
          '1',
          {
            meta: { flappingHistory, flapping: true },
          }
        );
        expect(isAlertFlapping(alert)).toEqual(false);
      });
    });
  });
});
