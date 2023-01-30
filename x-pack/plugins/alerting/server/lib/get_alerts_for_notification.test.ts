/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_FLAPPING_SETTINGS } from '../../common/rules_settings';
import { getAlertsForNotification } from '.';
import { Alert } from '../alert';

describe('getAlertsForNotification', () => {
  const flappingSettings = DEFAULT_FLAPPING_SETTINGS;

  test('should set pendingRecoveredCount to zero for all active alerts', () => {
    const alert1 = new Alert('1', { meta: { flapping: true, pendingRecoveredCount: 3 } });
    const alert2 = new Alert('2', { meta: { flapping: false } });

    const { newAlerts, activeAlerts } = getAlertsForNotification(
      flappingSettings,
      'default',
      {
        '1': alert1,
      },
      {
        '1': alert1,
        '2': alert2,
      },
      {},
      {}
    );
    expect(newAlerts).toMatchInlineSnapshot(`
      Object {
        "1": Object {
          "meta": Object {
            "flapping": true,
            "flappingHistory": Array [],
            "pendingRecoveredCount": 0,
          },
          "state": Object {},
        },
      }
    `);
    expect(activeAlerts).toMatchInlineSnapshot(`
      Object {
        "1": Object {
          "meta": Object {
            "flapping": true,
            "flappingHistory": Array [],
            "pendingRecoveredCount": 0,
          },
          "state": Object {},
        },
        "2": Object {
          "meta": Object {
            "flapping": false,
            "flappingHistory": Array [],
            "pendingRecoveredCount": 0,
          },
          "state": Object {},
        },
      }
    `);
  });

  test('should return flapping pending recovered alerts as active alerts', () => {
    const alert1 = new Alert('1', { meta: { flapping: true, pendingRecoveredCount: 3 } });
    const alert2 = new Alert('2', { meta: { flapping: false } });
    const alert3 = new Alert('3', { meta: { flapping: true } });

    const { newAlerts, activeAlerts, recoveredAlerts, currentRecoveredAlerts } =
      getAlertsForNotification(
        flappingSettings,
        'default',
        {},
        {},
        {
          '1': alert1,
          '2': alert2,
          '3': alert3,
        },
        {
          '1': alert1,
          '2': alert2,
          '3': alert3,
        }
      );

    expect(newAlerts).toMatchInlineSnapshot(`Object {}`);
    expect(activeAlerts).toMatchInlineSnapshot(`
      Object {
        "3": Object {
          "meta": Object {
            "flapping": true,
            "flappingHistory": Array [],
            "pendingRecoveredCount": 1,
          },
          "state": Object {},
        },
      }
    `);
    expect(Object.values(activeAlerts).map((a) => a.getScheduledActionOptions()))
      .toMatchInlineSnapshot(`
      Array [
        Object {
          "actionGroup": "default",
          "context": Object {},
          "state": Object {},
        },
      ]
    `);
    expect(recoveredAlerts).toMatchInlineSnapshot(`
      Object {
        "1": Object {
          "meta": Object {
            "flapping": true,
            "flappingHistory": Array [],
            "pendingRecoveredCount": 0,
          },
          "state": Object {},
        },
        "2": Object {
          "meta": Object {
            "flapping": false,
            "flappingHistory": Array [],
          },
          "state": Object {},
        },
      }
    `);
    expect(currentRecoveredAlerts).toMatchInlineSnapshot(`
      Object {
        "1": Object {
          "meta": Object {
            "flapping": true,
            "flappingHistory": Array [],
            "pendingRecoveredCount": 0,
          },
          "state": Object {},
        },
        "2": Object {
          "meta": Object {
            "flapping": false,
            "flappingHistory": Array [],
          },
          "state": Object {},
        },
      }
    `);
  });

  test('should reset counts and not modify alerts if flapping is disabled', () => {
    const alert1 = new Alert('1', { meta: { flapping: true, pendingRecoveredCount: 3 } });
    const alert2 = new Alert('2', { meta: { flapping: false } });
    const alert3 = new Alert('3', { meta: { flapping: true } });

    const { newAlerts, activeAlerts, recoveredAlerts, currentRecoveredAlerts } =
      getAlertsForNotification(
        { ...flappingSettings, enabled: false },
        'default',
        {},
        {},
        {
          '1': alert1,
          '2': alert2,
          '3': alert3,
        },
        {
          '1': alert1,
          '2': alert2,
          '3': alert3,
        }
      );

    expect(newAlerts).toMatchInlineSnapshot(`Object {}`);
    expect(activeAlerts).toMatchInlineSnapshot(`Object {}`);
    expect(recoveredAlerts).toMatchInlineSnapshot(`
      Object {
        "1": Object {
          "meta": Object {
            "flapping": true,
            "flappingHistory": Array [],
            "pendingRecoveredCount": 0,
          },
          "state": Object {},
        },
        "2": Object {
          "meta": Object {
            "flapping": false,
            "flappingHistory": Array [],
            "pendingRecoveredCount": 0,
          },
          "state": Object {},
        },
        "3": Object {
          "meta": Object {
            "flapping": true,
            "flappingHistory": Array [],
            "pendingRecoveredCount": 0,
          },
          "state": Object {},
        },
      }
    `);
    expect(currentRecoveredAlerts).toMatchInlineSnapshot(`
      Object {
        "1": Object {
          "meta": Object {
            "flapping": true,
            "flappingHistory": Array [],
            "pendingRecoveredCount": 0,
          },
          "state": Object {},
        },
        "2": Object {
          "meta": Object {
            "flapping": false,
            "flappingHistory": Array [],
            "pendingRecoveredCount": 0,
          },
          "state": Object {},
        },
        "3": Object {
          "meta": Object {
            "flapping": true,
            "flappingHistory": Array [],
            "pendingRecoveredCount": 0,
          },
          "state": Object {},
        },
      }
    `);
  });
});
