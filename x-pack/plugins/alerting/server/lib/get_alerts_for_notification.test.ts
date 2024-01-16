/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_FLAPPING_SETTINGS, DISABLE_FLAPPING_SETTINGS } from '../../common/rules_settings';
import { getAlertsForNotification } from '.';
import { Alert } from '../alert';
import { alertsWithAnyUUID } from '../test_utils';

describe('getAlertsForNotification', () => {
  test('should set pendingRecoveredCount to zero for all active alerts', () => {
    const alert1 = new Alert('1', {
      meta: { flapping: true, pendingRecoveredCount: 3, uuid: 'uuid-1' },
    });
    const alert2 = new Alert('2', { meta: { flapping: false, uuid: 'uuid-2' } });

    const { newAlerts, activeAlerts } = getAlertsForNotification(
      DEFAULT_FLAPPING_SETTINGS,
      true,
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
            "activeCount": 1,
            "flapping": true,
            "flappingHistory": Array [],
            "maintenanceWindowIds": Array [],
            "pendingRecoveredCount": 0,
            "uuid": "uuid-1",
          },
          "state": Object {},
        },
      }
    `);
    expect(activeAlerts).toMatchInlineSnapshot(`
      Object {
        "1": Object {
          "meta": Object {
            "activeCount": 1,
            "flapping": true,
            "flappingHistory": Array [],
            "maintenanceWindowIds": Array [],
            "pendingRecoveredCount": 0,
            "uuid": "uuid-1",
          },
          "state": Object {},
        },
        "2": Object {
          "meta": Object {
            "activeCount": 1,
            "flapping": false,
            "flappingHistory": Array [],
            "maintenanceWindowIds": Array [],
            "pendingRecoveredCount": 0,
            "uuid": "uuid-2",
          },
          "state": Object {},
        },
      }
    `);
  });

  test('should return flapping pending recovered alerts as active alerts and current active alerts', () => {
    const alert1 = new Alert('1', { meta: { flapping: true, pendingRecoveredCount: 3 } });
    const alert2 = new Alert('2', { meta: { flapping: false } });
    const alert3 = new Alert('3', { meta: { flapping: true } });

    const {
      newAlerts,
      activeAlerts,
      currentActiveAlerts,
      recoveredAlerts,
      currentRecoveredAlerts,
    } = getAlertsForNotification(
      DEFAULT_FLAPPING_SETTINGS,
      true,
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

    expect(alertsWithAnyUUID(newAlerts)).toMatchInlineSnapshot(`Object {}`);
    expect(alertsWithAnyUUID(activeAlerts)).toMatchInlineSnapshot(`
      Object {
        "3": Object {
          "meta": Object {
            "activeCount": 0,
            "flapping": true,
            "flappingHistory": Array [],
            "maintenanceWindowIds": Array [],
            "pendingRecoveredCount": 1,
            "uuid": Any<String>,
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
    expect(alertsWithAnyUUID(currentActiveAlerts)).toMatchInlineSnapshot(`
      Object {
        "3": Object {
          "meta": Object {
            "activeCount": 0,
            "flapping": true,
            "flappingHistory": Array [],
            "maintenanceWindowIds": Array [],
            "pendingRecoveredCount": 1,
            "uuid": Any<String>,
          },
          "state": Object {},
        },
      }
    `);
    expect(Object.values(currentActiveAlerts).map((a) => a.getScheduledActionOptions()))
      .toMatchInlineSnapshot(`
      Array [
        Object {
          "actionGroup": "default",
          "context": Object {},
          "state": Object {},
        },
      ]
  `);
    expect(alertsWithAnyUUID(recoveredAlerts)).toMatchInlineSnapshot(`
      Object {
        "1": Object {
          "meta": Object {
            "activeCount": 0,
            "flapping": true,
            "flappingHistory": Array [],
            "maintenanceWindowIds": Array [],
            "pendingRecoveredCount": 0,
            "uuid": Any<String>,
          },
          "state": Object {},
        },
        "2": Object {
          "meta": Object {
            "activeCount": 0,
            "flapping": false,
            "flappingHistory": Array [],
            "maintenanceWindowIds": Array [],
            "uuid": Any<String>,
          },
          "state": Object {},
        },
      }
    `);
    expect(alertsWithAnyUUID(currentRecoveredAlerts)).toMatchInlineSnapshot(`
      Object {
        "1": Object {
          "meta": Object {
            "activeCount": 0,
            "flapping": true,
            "flappingHistory": Array [],
            "maintenanceWindowIds": Array [],
            "pendingRecoveredCount": 0,
            "uuid": Any<String>,
          },
          "state": Object {},
        },
        "2": Object {
          "meta": Object {
            "activeCount": 0,
            "flapping": false,
            "flappingHistory": Array [],
            "maintenanceWindowIds": Array [],
            "uuid": Any<String>,
          },
          "state": Object {},
        },
      }
    `);
  });

  test('should reset counts and not modify alerts if flapping is disabled', () => {
    const alert1 = new Alert('1', {
      meta: { flapping: true, flappingHistory: [true, false, true], pendingRecoveredCount: 3 },
    });
    const alert2 = new Alert('2', {
      meta: { flapping: false, flappingHistory: [true, false, true] },
    });
    const alert3 = new Alert('3', {
      meta: { flapping: true, flappingHistory: [true, false, true] },
    });

    const { newAlerts, activeAlerts, recoveredAlerts, currentRecoveredAlerts } =
      getAlertsForNotification(
        DISABLE_FLAPPING_SETTINGS,
        true,
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
    expect(alertsWithAnyUUID(recoveredAlerts)).toMatchInlineSnapshot(`
      Object {
        "1": Object {
          "meta": Object {
            "activeCount": 0,
            "flapping": true,
            "flappingHistory": Array [
              true,
              false,
              true,
            ],
            "maintenanceWindowIds": Array [],
            "pendingRecoveredCount": 0,
            "uuid": Any<String>,
          },
          "state": Object {},
        },
        "2": Object {
          "meta": Object {
            "activeCount": 0,
            "flapping": false,
            "flappingHistory": Array [
              true,
              false,
              true,
            ],
            "maintenanceWindowIds": Array [],
            "pendingRecoveredCount": 0,
            "uuid": Any<String>,
          },
          "state": Object {},
        },
        "3": Object {
          "meta": Object {
            "activeCount": 0,
            "flapping": true,
            "flappingHistory": Array [
              true,
              false,
              true,
            ],
            "maintenanceWindowIds": Array [],
            "pendingRecoveredCount": 0,
            "uuid": Any<String>,
          },
          "state": Object {},
        },
      }
    `);
    expect(alertsWithAnyUUID(currentRecoveredAlerts)).toMatchInlineSnapshot(`
      Object {
        "1": Object {
          "meta": Object {
            "activeCount": 0,
            "flapping": true,
            "flappingHistory": Array [
              true,
              false,
              true,
            ],
            "maintenanceWindowIds": Array [],
            "pendingRecoveredCount": 0,
            "uuid": Any<String>,
          },
          "state": Object {},
        },
        "2": Object {
          "meta": Object {
            "activeCount": 0,
            "flapping": false,
            "flappingHistory": Array [
              true,
              false,
              true,
            ],
            "maintenanceWindowIds": Array [],
            "pendingRecoveredCount": 0,
            "uuid": Any<String>,
          },
          "state": Object {},
        },
        "3": Object {
          "meta": Object {
            "activeCount": 0,
            "flapping": true,
            "flappingHistory": Array [
              true,
              false,
              true,
            ],
            "maintenanceWindowIds": Array [],
            "pendingRecoveredCount": 0,
            "uuid": Any<String>,
          },
          "state": Object {},
        },
      }
    `);
  });

  test('should return flapping pending recovered alerts as active alerts only when notifyWhen is onActionGroupChange', () => {
    const alert1 = new Alert('1', { meta: { flapping: true, pendingRecoveredCount: 3 } });
    const alert2 = new Alert('2', { meta: { flapping: false } });
    const alert3 = new Alert('3', { meta: { flapping: true } });

    const {
      newAlerts,
      activeAlerts,
      currentActiveAlerts,
      recoveredAlerts,
      currentRecoveredAlerts,
    } = getAlertsForNotification(
      DEFAULT_FLAPPING_SETTINGS,
      false,
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
    expect(alertsWithAnyUUID(activeAlerts)).toMatchInlineSnapshot(`
      Object {
        "3": Object {
          "meta": Object {
            "activeCount": 0,
            "flapping": true,
            "flappingHistory": Array [],
            "maintenanceWindowIds": Array [],
            "pendingRecoveredCount": 1,
            "uuid": Any<String>,
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
    expect(currentActiveAlerts).toMatchInlineSnapshot(`Object {}`);
    expect(
      Object.values(currentActiveAlerts).map((a) => a.getScheduledActionOptions())
    ).toMatchInlineSnapshot(`Array []`);
    expect(alertsWithAnyUUID(recoveredAlerts)).toMatchInlineSnapshot(`
      Object {
        "1": Object {
          "meta": Object {
            "activeCount": 0,
            "flapping": true,
            "flappingHistory": Array [],
            "maintenanceWindowIds": Array [],
            "pendingRecoveredCount": 0,
            "uuid": Any<String>,
          },
          "state": Object {},
        },
        "2": Object {
          "meta": Object {
            "activeCount": 0,
            "flapping": false,
            "flappingHistory": Array [],
            "maintenanceWindowIds": Array [],
            "uuid": Any<String>,
          },
          "state": Object {},
        },
      }
    `);
    expect(alertsWithAnyUUID(currentRecoveredAlerts)).toMatchInlineSnapshot(`
      Object {
        "1": Object {
          "meta": Object {
            "activeCount": 0,
            "flapping": true,
            "flappingHistory": Array [],
            "maintenanceWindowIds": Array [],
            "pendingRecoveredCount": 0,
            "uuid": Any<String>,
          },
          "state": Object {},
        },
        "2": Object {
          "meta": Object {
            "activeCount": 0,
            "flapping": false,
            "flappingHistory": Array [],
            "maintenanceWindowIds": Array [],
            "uuid": Any<String>,
          },
          "state": Object {},
        },
      }
    `);
  });

  test('should increment activeCount for all active alerts', () => {
    const alert1 = new Alert('1', {
      meta: { activeCount: 1, uuid: 'uuid-1' },
    });
    const alert2 = new Alert('2', { meta: { uuid: 'uuid-2' } });

    const { newAlerts, activeAlerts } = getAlertsForNotification(
      DEFAULT_FLAPPING_SETTINGS,
      true,
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
            "activeCount": 2,
            "flappingHistory": Array [],
            "maintenanceWindowIds": Array [],
            "pendingRecoveredCount": 0,
            "uuid": "uuid-1",
          },
          "state": Object {},
        },
      }
    `);
    expect(activeAlerts).toMatchInlineSnapshot(`
      Object {
        "1": Object {
          "meta": Object {
            "activeCount": 2,
            "flappingHistory": Array [],
            "maintenanceWindowIds": Array [],
            "pendingRecoveredCount": 0,
            "uuid": "uuid-1",
          },
          "state": Object {},
        },
        "2": Object {
          "meta": Object {
            "activeCount": 1,
            "flappingHistory": Array [],
            "maintenanceWindowIds": Array [],
            "pendingRecoveredCount": 0,
            "uuid": "uuid-2",
          },
          "state": Object {},
        },
      }
    `);
  });

  test('should reset activeCount for all recovered alerts', () => {
    const alert1 = new Alert('1', { meta: { activeCount: 3 } });
    const alert3 = new Alert('3');

    const { recoveredAlerts, currentRecoveredAlerts } = getAlertsForNotification(
      DEFAULT_FLAPPING_SETTINGS,
      true,
      'default',
      {},
      {},
      {
        '1': alert1,
        '3': alert3,
      },
      {
        '1': alert1,
        '3': alert3,
      }
    );

    expect(alertsWithAnyUUID(recoveredAlerts)).toMatchInlineSnapshot(`
      Object {
        "1": Object {
          "meta": Object {
            "activeCount": 0,
            "flappingHistory": Array [],
            "maintenanceWindowIds": Array [],
            "uuid": Any<String>,
          },
          "state": Object {},
        },
        "3": Object {
          "meta": Object {
            "activeCount": 0,
            "flappingHistory": Array [],
            "maintenanceWindowIds": Array [],
            "uuid": Any<String>,
          },
          "state": Object {},
        },
      }
    `);
    expect(alertsWithAnyUUID(currentRecoveredAlerts)).toMatchInlineSnapshot(`
      Object {
        "1": Object {
          "meta": Object {
            "activeCount": 0,
            "flappingHistory": Array [],
            "maintenanceWindowIds": Array [],
            "uuid": Any<String>,
          },
          "state": Object {},
        },
        "3": Object {
          "meta": Object {
            "activeCount": 0,
            "flappingHistory": Array [],
            "maintenanceWindowIds": Array [],
            "uuid": Any<String>,
          },
          "state": Object {},
        },
      }
    `);
  });
});
