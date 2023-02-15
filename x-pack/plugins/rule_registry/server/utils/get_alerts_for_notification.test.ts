/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RuleNotifyWhen } from '@kbn/alerting-plugin/common';
import {
  DEFAULT_FLAPPING_SETTINGS,
  DISABLE_FLAPPING_SETTINGS,
} from '@kbn/alerting-plugin/common/rules_settings';
import { ALERT_STATUS_ACTIVE, ALERT_STATUS_RECOVERED } from '@kbn/rule-data-utils';
import { cloneDeep } from 'lodash';
import { getAlertsForNotification } from './get_alerts_for_notification';

describe('getAlertsForNotification', () => {
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
    const expected = [
      {
        event: {
          'kibana.alert.status': 'active',
        },
        flappingHistory: [true, true],
        pendingRecoveredCount: 0,
      },
    ];
    const alertsToNotify = getAlertsForNotification(
      DEFAULT_FLAPPING_SETTINGS,
      trackedEvents,
      RuleNotifyWhen.CHANGE
    );
    expect(alertsToNotify).toEqual(expected);
    expect(trackedEvents).toEqual(expected);
  });

  test('should return flapping pending recovered alerts as active if the num of recovered alerts is not at the limit', () => {
    const trackedEvents = cloneDeep([alert1, alert2, alert3]);
    const expected = [
      {
        event: {
          'kibana.alert.status': 'recovered',
        },
        flapping: true,
        pendingRecoveredCount: 0,
      },
      {
        event: {
          'kibana.alert.status': 'recovered',
        },
        flapping: false,
      },
      {
        event: {
          'event.action': 'active',
          'kibana.alert.status': 'active',
        },
        flapping: true,
        pendingRecoveredCount: 1,
      },
    ];
    const alertsToNotify = getAlertsForNotification(
      DEFAULT_FLAPPING_SETTINGS,
      trackedEvents,
      RuleNotifyWhen.CHANGE
    );

    expect(alertsToNotify).toEqual(expected);
    expect(trackedEvents).toEqual(expected);
  });

  test('should reset counts and not modify alerts if flapping is disabled', () => {
    const trackedEvents = cloneDeep([alert1, alert2, alert3]);
    const expected = [
      {
        event: {
          'kibana.alert.status': 'recovered',
        },
        flapping: true,
        pendingRecoveredCount: 0,
      },
      {
        event: {
          'kibana.alert.status': 'recovered',
        },
        flapping: false,
        pendingRecoveredCount: 0,
      },
      {
        event: {
          'kibana.alert.status': 'recovered',
        },
        flapping: true,
        pendingRecoveredCount: 0,
      },
    ];

    const alertsToNotify = getAlertsForNotification(
      DISABLE_FLAPPING_SETTINGS,
      trackedEvents,
      RuleNotifyWhen.CHANGE
    );
    expect(alertsToNotify).toEqual(expected);
    expect(trackedEvents).toEqual(expected);
  });

  test('should not return flapping pending recovered alerts as active when notifyWhen is not onActionGroupChange', () => {
    const trackedEvents = cloneDeep([alert1, alert2, alert3]);
    const expected = [
      {
        event: {
          'kibana.alert.status': 'recovered',
        },
        flapping: true,
        pendingRecoveredCount: 0,
      },
      {
        event: {
          'kibana.alert.status': 'recovered',
        },
        flapping: false,
      },
    ];
    const alertsToNotify = getAlertsForNotification(
      DEFAULT_FLAPPING_SETTINGS,
      trackedEvents,
      RuleNotifyWhen.ACTIVE
    );

    expect(alertsToNotify).toEqual(expected);
    expect(trackedEvents).toEqual([
      ...expected,
      {
        event: {
          'event.action': 'active',
          'kibana.alert.status': 'active',
        },
        flapping: true,
        pendingRecoveredCount: 1,
      },
    ]);
  });
});
