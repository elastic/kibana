/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import * as React from 'react';
import uuid from 'uuid';
import { shallow } from 'enzyme';
import { AlertInstances, AlertInstanceListItem, alertInstanceToListItem } from './alert_instances';
import { Alert, AlertTaskState, RawAlertInstance } from '../../../../types';
import { EuiBasicTable } from '@elastic/eui';

const fakeNow = new Date('2020-02-09T23:15:41.941Z');
const fake2MinutesAgo = new Date('2020-02-09T23:13:41.941Z');

const mockAPIs = {
  muteAlertInstance: jest.fn(),
  unmuteAlertInstance: jest.fn(),
  requestRefresh: jest.fn(),
};

beforeAll(() => {
  jest.resetAllMocks();
  global.Date.now = jest.fn(() => fakeNow.getTime());
});

jest.mock('../../../app_context', () => {
  const toastNotifications = jest.fn();
  return {
    useAppDependencies: jest.fn(() => ({ toastNotifications })),
  };
});

describe('alert_instances', () => {
  it('render a list of alert instances', () => {
    const alert = mockAlert();

    const alertState = mockAlertState();
    const instances: AlertInstanceListItem[] = [
      alertInstanceToListItem(alert, 'first_instance', alertState.alertInstances!.first_instance),
      alertInstanceToListItem(alert, 'second_instance', alertState.alertInstances!.second_instance),
    ];

    expect(
      shallow(<AlertInstances {...mockAPIs} alert={alert} alertState={alertState} />)
        .find(EuiBasicTable)
        .prop('items')
    ).toEqual(instances);
  });

  it('render all active alert instances', () => {
    const alert = mockAlert();
    const instances = {
      ['us-central']: {
        state: {},
        meta: {
          lastScheduledActions: {
            group: 'warning',
            date: fake2MinutesAgo,
          },
        },
      },
      ['us-east']: {},
    };
    expect(
      shallow(
        <AlertInstances
          {...mockAPIs}
          alert={alert}
          alertState={mockAlertState({
            alertInstances: instances,
          })}
        />
      )
        .find(EuiBasicTable)
        .prop('items')
    ).toEqual([
      alertInstanceToListItem(alert, 'us-central', instances['us-central']),
      alertInstanceToListItem(alert, 'us-east', instances['us-east']),
    ]);
  });

  it('render all inactive alert instances', () => {
    const alert = mockAlert({
      mutedInstanceIds: ['us-west', 'us-east'],
    });

    expect(
      shallow(
        <AlertInstances
          {...mockAPIs}
          alert={alert}
          alertState={mockAlertState({
            alertInstances: {},
          })}
        />
      )
        .find(EuiBasicTable)
        .prop('items')
    ).toEqual([
      alertInstanceToListItem(alert, 'us-west'),
      alertInstanceToListItem(alert, 'us-east'),
    ]);
  });
});

describe('alertInstanceToListItem', () => {
  it('handles active instances', () => {
    const alert = mockAlert();
    const start = fake2MinutesAgo;
    const instance: RawAlertInstance = {
      meta: {
        lastScheduledActions: {
          date: start,
          group: 'default',
        },
      },
    };

    expect(alertInstanceToListItem(alert, 'id', instance)).toEqual({
      instance: 'id',
      status: { label: 'Active', healthColor: 'primary' },
      start,
      duration: fakeNow.getTime() - fake2MinutesAgo.getTime(),
      isMuted: false,
    });
  });

  it('handles active muted instances', () => {
    const alert = mockAlert({
      mutedInstanceIds: ['id'],
    });
    const start = fake2MinutesAgo;
    const instance: RawAlertInstance = {
      meta: {
        lastScheduledActions: {
          date: start,
          group: 'default',
        },
      },
    };

    expect(alertInstanceToListItem(alert, 'id', instance)).toEqual({
      instance: 'id',
      status: { label: 'Active', healthColor: 'primary' },
      start,
      duration: fakeNow.getTime() - fake2MinutesAgo.getTime(),
      isMuted: true,
    });
  });

  it('handles active instances with no meta', () => {
    const alert = mockAlert();
    const instance: RawAlertInstance = {};

    expect(alertInstanceToListItem(alert, 'id', instance)).toEqual({
      instance: 'id',
      status: { label: 'Active', healthColor: 'primary' },
      start: undefined,
      duration: 0,
      isMuted: false,
    });
  });

  it('handles active instances with no lastScheduledActions', () => {
    const alert = mockAlert();
    const instance: RawAlertInstance = {
      meta: {},
    };

    expect(alertInstanceToListItem(alert, 'id', instance)).toEqual({
      instance: 'id',
      status: { label: 'Active', healthColor: 'primary' },
      start: undefined,
      duration: 0,
      isMuted: false,
    });
  });

  it('handles muted inactive instances', () => {
    const alert = mockAlert({
      mutedInstanceIds: ['id'],
    });
    expect(alertInstanceToListItem(alert, 'id')).toEqual({
      instance: 'id',
      status: { label: 'Inactive', healthColor: 'subdued' },
      start: undefined,
      duration: 0,
      isMuted: true,
    });
  });
});

function mockAlert(overloads: Partial<Alert> = {}): Alert {
  return {
    id: uuid.v4(),
    enabled: true,
    name: `alert-${uuid.v4()}`,
    tags: [],
    alertTypeId: '.noop',
    consumer: 'consumer',
    schedule: { interval: '1m' },
    actions: [],
    params: {},
    createdBy: null,
    updatedBy: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    apiKeyOwner: null,
    throttle: null,
    muteAll: false,
    mutedInstanceIds: [],
    ...overloads,
  };
}

function mockAlertState(overloads: Partial<any> = {}): AlertTaskState {
  return {
    alertTypeState: {
      some: 'value',
    },
    alertInstances: {
      first_instance: {
        state: {},
        meta: {
          lastScheduledActions: {
            group: 'first_group',
            date: new Date(),
          },
        },
      },
      second_instance: {},
    },
    ...overloads,
  };
}
