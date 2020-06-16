/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { alertReducer } from './alert_reducer';
import { Alert } from '../../../types';

describe('alert reducer', () => {
  let initialAlert: Alert;
  beforeAll(() => {
    initialAlert = ({
      params: {},
      consumer: 'alerts',
      alertTypeId: null,
      schedule: {
        interval: '1m',
      },
      actions: [],
      tags: [],
    } as unknown) as Alert;
  });

  // setAlert
  test('if modified alert was reset to initial', () => {
    const alert = alertReducer(
      { alert: initialAlert },
      {
        command: { type: 'setProperty' },
        payload: {
          key: 'name',
          value: 'new name',
        },
      }
    );
    expect(alert.alert.name).toBe('new name');

    const updatedAlert = alertReducer(
      { alert: initialAlert },
      {
        command: { type: 'setAlert' },
        payload: {
          key: 'alert',
          value: initialAlert,
        },
      }
    );
    expect(updatedAlert.alert.name).toBeUndefined();
  });

  test('if property name was changed', () => {
    const updatedAlert = alertReducer(
      { alert: initialAlert },
      {
        command: { type: 'setProperty' },
        payload: {
          key: 'name',
          value: 'new name',
        },
      }
    );
    expect(updatedAlert.alert.name).toBe('new name');
  });

  test('if initial schedule property was updated', () => {
    const updatedAlert = alertReducer(
      { alert: initialAlert },
      {
        command: { type: 'setScheduleProperty' },
        payload: {
          key: 'interval',
          value: '10s',
        },
      }
    );
    expect(updatedAlert.alert.schedule.interval).toBe('10s');
  });

  test('if alert params property was added and updated', () => {
    const updatedAlert = alertReducer(
      { alert: initialAlert },
      {
        command: { type: 'setAlertParams' },
        payload: {
          key: 'testParam',
          value: 'new test params property',
        },
      }
    );
    expect(updatedAlert.alert.params.testParam).toBe('new test params property');

    const updatedAlertParamsProperty = alertReducer(
      { alert: updatedAlert.alert },
      {
        command: { type: 'setAlertParams' },
        payload: {
          key: 'testParam',
          value: 'test params property updated',
        },
      }
    );
    expect(updatedAlertParamsProperty.alert.params.testParam).toBe('test params property updated');
  });

  test('if alert action params property was added and updated', () => {
    initialAlert.actions.push({
      id: '',
      actionTypeId: 'testId',
      group: 'Alert',
      params: {},
    });
    const updatedAlert = alertReducer(
      { alert: initialAlert },
      {
        command: { type: 'setAlertActionParams' },
        payload: {
          key: 'testActionParam',
          value: 'new test action params property',
          index: 0,
        },
      }
    );
    expect(updatedAlert.alert.actions[0].params.testActionParam).toBe(
      'new test action params property'
    );

    const updatedAlertActionParamsProperty = alertReducer(
      { alert: updatedAlert.alert },
      {
        command: { type: 'setAlertActionParams' },
        payload: {
          key: 'testActionParam',
          value: 'test action params property updated',
          index: 0,
        },
      }
    );
    expect(updatedAlertActionParamsProperty.alert.actions[0].params.testActionParam).toBe(
      'test action params property updated'
    );
  });

  test('if alert action property was updated', () => {
    initialAlert.actions.push({
      id: '',
      actionTypeId: 'testId',
      group: 'Alert',
      params: {},
    });
    const updatedAlert = alertReducer(
      { alert: initialAlert },
      {
        command: { type: 'setAlertActionProperty' },
        payload: {
          key: 'group',
          value: 'Warning',
          index: 0,
        },
      }
    );
    expect(updatedAlert.alert.actions[0].group).toBe('Warning');
  });
});
