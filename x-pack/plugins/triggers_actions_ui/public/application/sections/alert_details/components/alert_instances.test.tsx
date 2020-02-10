/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import * as React from 'react';
import uuid from 'uuid';
import { shallow } from 'enzyme';
import {
  AlertInstances,
  alertInstancesTableColumns,
  AlertInstanceListItem,
  alertInstanceToListItem,
} from './alert_instances';
import { Alert, AlertTaskState, RawAlertInstance } from '../../../../types';
import { EuiBasicTable } from '@elastic/eui';

const fakeNow = new Date('2020-02-09T23:15:41.941Z');
const fake2MinutesAgo = new Date('2020-02-09T23:13:41.941Z');

beforeAll(() => {
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
      alertInstanceToListItem('first_instance', alertState.alertInstances!.first_instance),
      alertInstanceToListItem('second_instance', alertState.alertInstances!.second_instance),
    ];

    expect(
      shallow(<AlertInstances alert={alert} alertState={alertState} />).containsMatchingElement(
        <EuiBasicTable
          items={instances}
          columns={alertInstancesTableColumns}
          data-test-subj="alertInstancesList"
        />
      )
    ).toBeTruthy();
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
          alert={alert}
          alertState={mockAlertState({
            alertInstances: instances,
          })}
        />
      ).containsMatchingElement(
        <EuiBasicTable
          items={[
            alertInstanceToListItem('us-central', instances['us-central']),
            alertInstanceToListItem('us-east', instances['us-east']),
          ]}
          columns={alertInstancesTableColumns}
          data-test-subj="alertInstancesList"
        />
      )
    ).toBeTruthy();
  });

  it('render all inactive alert instances', () => {
    const alert = mockAlert({
      mutedInstanceIds: ['us-west', 'us-east'],
    });

    expect(
      shallow(
        <AlertInstances
          alert={alert}
          alertState={mockAlertState({
            alertInstances: {},
          })}
        />
      ).containsMatchingElement(
        <EuiBasicTable
          items={[alertInstanceToListItem('us-west'), alertInstanceToListItem('us-east')]}
          columns={alertInstancesTableColumns}
          data-test-subj="alertInstancesList"
        />
      )
    ).toBeTruthy();
  });
});

describe('alertInstanceToListItem', () => {
  it('handles active instances', () => {
    const start = fake2MinutesAgo;
    const instance: RawAlertInstance = {
      meta: {
        lastScheduledActions: {
          date: start,
          group: 'default',
        },
      },
    };

    expect(alertInstanceToListItem('id', instance)).toEqual({
      instance: 'id',
      status: 'Active',
      start,
      duration: fakeNow.getTime() - fake2MinutesAgo.getTime(),
      isMuted: false,
    });
  });

  it('handles active instances with no meta', () => {
    const instance: RawAlertInstance = {};

    expect(alertInstanceToListItem('id', instance)).toEqual({
      instance: 'id',
      status: 'Active',
      start: undefined,
      duration: 0,
      isMuted: false,
    });
  });

  it('handles active instances with no lastScheduledActions', () => {
    const instance: RawAlertInstance = {
      meta: {},
    };

    expect(alertInstanceToListItem('id', instance)).toEqual({
      instance: 'id',
      status: 'Active',
      start: undefined,
      duration: 0,
      isMuted: false,
    });
  });

  it('handles muted instances', () => {
    expect(alertInstanceToListItem('id')).toEqual({
      instance: 'id',
      status: 'Inactive',
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
