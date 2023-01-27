/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getAlertsForNotification } from '.';
import { Alert } from '../alert';

describe('getAlertsForNotification', () => {
  test('should set pendingRecoveredCount to zero for all active alerts', () => {
    const alert1 = new Alert('1', { meta: { flapping: true, pendingRecoveredCount: 3 } });
    const alert2 = new Alert('2', { meta: { flapping: false } });

    const { newAlerts, activeAlerts } = getAlertsForNotification(
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

    expect(removeUuids(newAlerts)).toMatchInlineSnapshot(`Object {}`);
    expect(removeUuids(activeAlerts)).toMatchInlineSnapshot(`
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
    expect(Object.values(removeUuids(activeAlerts)).map((a) => a.getScheduledActionOptions()))
      .toMatchInlineSnapshot(`
      Array [
        Object {
          "actionGroup": "default",
          "context": Object {},
          "state": Object {},
        },
      ]
    `);
    expect(removeUuids(recoveredAlerts)).toMatchInlineSnapshot(`
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
});

function removeUuids<T>(alerts: T): T {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const alert of Object.values(alerts as Record<string, any>)) {
    delete alert?.meta?.uuid;
  }
  return alerts;
}
