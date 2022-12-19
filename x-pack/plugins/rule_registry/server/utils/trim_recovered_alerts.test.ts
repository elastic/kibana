/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createAlertFactory } from '@kbn/alerting-plugin/server/alert';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { ALERT_STATUS_ACTIVE, ALERT_STATUS_RECOVERED } from '@kbn/rule-data-utils';
import { trimRecoveredAlerts } from './trim_recovered_alerts';

describe('trimRecoveredAlerts', () => {
  const logger = loggingSystemMock.createLogger();
  const alertFactory = createAlertFactory({
    alerts: {},
    logger,
    maxAlerts: 2,
  });

  const alert1 = {
    event: {
      'kibana.alert.status': ALERT_STATUS_RECOVERED,
    },
    flappingHistory: [true, true, true, true],
  };
  const alert2 = {
    event: {
      'kibana.alert.status': ALERT_STATUS_RECOVERED,
    },
    flappingHistory: new Array(20).fill(false),
  };
  const alert3 = {
    event: {
      'kibana.alert.status': ALERT_STATUS_RECOVERED,
    },
    flappingHistory: [true, true],
  };
  const alert4 = {
    event: {
      'kibana.alert.status': ALERT_STATUS_ACTIVE,
    },
    flappingHistory: [true, true],
  };

  test('should remove longest recovered alerts', () => {
    const recoveredEvents = [alert1, alert2, alert3];
    const trackedEvents = [alert2, alert4];

    const trimmedAlerts = trimRecoveredAlerts(recoveredEvents, trackedEvents, alertFactory);
    expect(trimmedAlerts.trackedEventsToIndex).toEqual([alert4]);
    expect(trimmedAlerts.trackedRecoveredEventsToIndex).toEqual([alert1, alert3]);
    expect(trimmedAlerts.earlyRecoveredEvents).toEqual([
      { ...alert2, flapping: false },
      { ...alert2, flapping: false },
    ]);
  });

  test('should not remove alerts if the num of recovered alerts is not at the limit', () => {
    const recoveredEvents = [alert1, alert2];
    const trackedEvents = [alert4];

    const trimmedAlerts = trimRecoveredAlerts(recoveredEvents, trackedEvents, alertFactory);
    expect(trimmedAlerts.trackedEventsToIndex).toEqual(trackedEvents);
    expect(trimmedAlerts.trackedRecoveredEventsToIndex).toEqual(recoveredEvents);
    expect(trimmedAlerts.earlyRecoveredEvents).toEqual([]);
  });
});
