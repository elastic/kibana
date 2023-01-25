/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  RulesSettingsFlapping,
  DEFAULT_FLAPPING_SETTINGS,
} from '@kbn/alerting-plugin/common/rules_settings';
import { ALERT_STATUS_ACTIVE, ALERT_STATUS_RECOVERED } from '@kbn/rule-data-utils';
import { cloneDeep } from 'lodash';
import { getAlertsForNotification } from './get_alerts_for_notification';

describe('getAlertsForNotification', () => {
  const flappingSettings = DEFAULT_FLAPPING_SETTINGS as RulesSettingsFlapping;

  const alert1 = {
    event: {
      'kibana.alert.status': ALERT_STATUS_RECOVERED,
    },
    flapping: true,
    pendingRecoveredCount: 3,
  };
  const alert2 = {
    event: {
      'kibana.alert.status': ALERT_STATUS_RECOVERED,
    },
    flapping: false,
  };
  const alert3 = {
    event: {
      'kibana.alert.status': ALERT_STATUS_RECOVERED,
    },
    flapping: true,
  };
  const alert4 = {
    event: {
      'kibana.alert.status': ALERT_STATUS_ACTIVE,
    },
    pendingRecoveredCount: 4,
    flappingHistory: [true, true],
  };

  test('should set pendingRecoveredCount to zero for all active alerts', () => {
    const trackedEvents = [alert4];
    expect(getAlertsForNotification(flappingSettings, trackedEvents)).toMatchInlineSnapshot(`
      Array [
        Object {
          "event": Object {
            "kibana.alert.status": "active",
          },
          "flappingHistory": Array [
            true,
            true,
          ],
          "pendingRecoveredCount": 0,
        },
      ]
    `);
  });

  test('should not remove alerts if the num of recovered alerts is not at the limit', () => {
    const trackedEvents = cloneDeep([alert1, alert2, alert3]);
    expect(getAlertsForNotification(flappingSettings, trackedEvents)).toMatchInlineSnapshot(`
      Array [
        Object {
          "event": Object {
            "kibana.alert.status": "recovered",
          },
          "flapping": true,
          "pendingRecoveredCount": 0,
        },
        Object {
          "event": Object {
            "kibana.alert.status": "recovered",
          },
          "flapping": false,
        },
        Object {
          "event": Object {
            "event.action": "active",
            "kibana.alert.status": "active",
          },
          "flapping": true,
          "pendingRecoveredCount": 1,
        },
      ]
    `);
  });

  test('should reset counts and not modify alerts if flapping is disabled', () => {
    const trackedEvents = cloneDeep([alert1, alert2, alert3]);
    expect(getAlertsForNotification({ ...flappingSettings, enabled: false }, trackedEvents))
      .toMatchInlineSnapshot(`
      Array [
        Object {
          "event": Object {
            "kibana.alert.status": "recovered",
          },
          "flapping": true,
          "pendingRecoveredCount": 0,
        },
        Object {
          "event": Object {
            "kibana.alert.status": "recovered",
          },
          "flapping": false,
          "pendingRecoveredCount": 0,
        },
        Object {
          "event": Object {
            "kibana.alert.status": "recovered",
          },
          "flapping": true,
          "pendingRecoveredCount": 0,
        },
      ]
    `);
  });
});
