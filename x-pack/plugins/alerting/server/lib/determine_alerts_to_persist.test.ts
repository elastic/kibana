/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mapValues } from 'lodash';
import { Alert } from '../alert';
import { determineAlertsToPersist } from './determine_alerts_to_persist';

describe('determineAlertsToPersist', () => {
  const flapping = new Array(16).fill(false).concat([true, true, true, true]);
  const notFlapping = new Array(20).fill(false);

  test('should return all active alert ids regardless of flapping', () => {
    const activeAlerts = {
      '1': new Alert('1', { meta: { flappingHistory: flapping } }),
      '2': new Alert('2', { meta: { flappingHistory: [false, false] } }),
    };
    const { activeAlertIds } = determineAlertsToPersist(
      mapValues(activeAlerts, (alert) => ({
        flapping: alert.getFlapping(),
        flappingHistory: alert.getFlappingHistory() ?? [],
      })),
      {}
    );
    expect(activeAlertIds.length).toEqual(2);
    expect(activeAlertIds).toEqual(['1', '2']);
  });

  test('should return only recovered alerts that are flapping', () => {
    const recoveredAlerts = {
      '1': new Alert('1', { meta: { flappingHistory: flapping } }),
      '2': new Alert('2', { meta: { flappingHistory: notFlapping } }),
    };
    const { recoveredAlertIds } = determineAlertsToPersist(
      {},
      mapValues(recoveredAlerts, (alert) => ({
        flapping: alert.getFlapping(),
        flappingHistory: alert.getFlappingHistory() ?? [],
      }))
    );
    expect(recoveredAlertIds).toEqual(['1']);
  });
});
