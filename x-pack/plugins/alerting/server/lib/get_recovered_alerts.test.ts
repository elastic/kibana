/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getRecoveredAlerts } from './get_recovered_alerts';
import { Alert } from '../alert';
import { AlertInstanceState, AlertInstanceContext, DefaultActionGroupId } from '../types';

describe('getRecoveredAlerts', () => {
  test('considers alert recovered if it has no scheduled actions', () => {
    const alert1 = new Alert<AlertInstanceState, AlertInstanceContext, DefaultActionGroupId>('1');
    alert1.scheduleActions('default', { foo: '1' });

    const alert2 = new Alert<AlertInstanceState, AlertInstanceContext, DefaultActionGroupId>('2');
    alert2.setContext({ foo: '2' });
    const alerts = {
      '1': alert1,
      '2': alert2,
    };

    expect(getRecoveredAlerts(alerts, new Set(['1', '2']))).toEqual({
      '2': alert2,
    });
  });

  test('does not consider alert recovered if it has no actions but was not in original alerts list', () => {
    const alert1 = new Alert<AlertInstanceState, AlertInstanceContext, DefaultActionGroupId>('1');
    alert1.scheduleActions('default', { foo: '1' });
    const alert2 = new Alert<AlertInstanceState, AlertInstanceContext, DefaultActionGroupId>('2');
    const alerts = {
      '1': alert1,
      '2': alert2,
    };

    expect(getRecoveredAlerts(alerts, new Set(['1']))).toEqual({});
  });
});
