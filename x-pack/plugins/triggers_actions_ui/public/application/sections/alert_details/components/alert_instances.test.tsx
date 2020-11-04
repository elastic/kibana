/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import * as React from 'react';
import uuid from 'uuid';
import { shallow } from 'enzyme';
import { AlertInstances, AlertInstanceListItem, alertInstanceToListItem } from './alert_instances';
import { Alert, AlertInstanceSummary, AlertInstanceStatus } from '../../../../types';
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
    const alertInstanceSummary = mockAlertInstanceSummary({
      instances: {
        first_instance: {
          status: 'OK',
          muted: false,
        },
        second_instance: {
          status: 'Active',
          muted: false,
        },
      },
    });

    const instances: AlertInstanceListItem[] = [
      // active first
      alertInstanceToListItem(
        fakeNow.getTime(),
        alert,
        'second_instance',
        alertInstanceSummary.instances.second_instance
      ),
      // ok second
      alertInstanceToListItem(
        fakeNow.getTime(),
        alert,
        'first_instance',
        alertInstanceSummary.instances.first_instance
      ),
    ];

    expect(
      shallow(
        <AlertInstances
          {...mockAPIs}
          alert={alert}
          alertInstanceSummary={alertInstanceSummary}
          readOnly={false}
        />
      )
        .find(EuiBasicTable)
        .prop('items')
    ).toEqual(instances);
  });

  it('render a hidden field with duration epoch', () => {
    const alert = mockAlert();
    const alertInstanceSummary = mockAlertInstanceSummary();

    expect(
      shallow(
        <AlertInstances
          durationEpoch={fake2MinutesAgo.getTime()}
          {...mockAPIs}
          alert={alert}
          readOnly={false}
          alertInstanceSummary={alertInstanceSummary}
        />
      )
        .find('[name="alertInstancesDurationEpoch"]')
        .prop('value')
    ).toEqual(fake2MinutesAgo.getTime());
  });

  it('render all active alert instances', () => {
    const alert = mockAlert();
    const instances: Record<string, AlertInstanceStatus> = {
      ['us-central']: {
        status: 'OK',
        muted: false,
      },
      ['us-east']: {
        status: 'OK',
        muted: false,
      },
    };
    expect(
      shallow(
        <AlertInstances
          {...mockAPIs}
          alert={alert}
          readOnly={false}
          alertInstanceSummary={mockAlertInstanceSummary({
            instances,
          })}
        />
      )
        .find(EuiBasicTable)
        .prop('items')
    ).toEqual([
      alertInstanceToListItem(fakeNow.getTime(), alert, 'us-central', instances['us-central']),
      alertInstanceToListItem(fakeNow.getTime(), alert, 'us-east', instances['us-east']),
    ]);
  });

  it('render all inactive alert instances', () => {
    const alert = mockAlert({
      mutedInstanceIds: ['us-west', 'us-east'],
    });
    const instanceUsWest: AlertInstanceStatus = { status: 'OK', muted: false };
    const instanceUsEast: AlertInstanceStatus = { status: 'OK', muted: false };

    expect(
      shallow(
        <AlertInstances
          {...mockAPIs}
          alert={alert}
          readOnly={false}
          alertInstanceSummary={mockAlertInstanceSummary({
            instances: {
              'us-west': {
                status: 'OK',
                muted: false,
              },
              'us-east': {
                status: 'OK',
                muted: false,
              },
            },
          })}
        />
      )
        .find(EuiBasicTable)
        .prop('items')
    ).toEqual([
      alertInstanceToListItem(fakeNow.getTime(), alert, 'us-west', instanceUsWest),
      alertInstanceToListItem(fakeNow.getTime(), alert, 'us-east', instanceUsEast),
    ]);
  });
});

describe('alertInstanceToListItem', () => {
  it('handles active instances', () => {
    const alert = mockAlert();
    const start = fake2MinutesAgo;
    const instance: AlertInstanceStatus = {
      status: 'Active',
      muted: false,
      activeStartDate: fake2MinutesAgo.toISOString(),
    };

    expect(alertInstanceToListItem(fakeNow.getTime(), alert, 'id', instance)).toEqual({
      instance: 'id',
      status: { label: 'Active', healthColor: 'primary' },
      start,
      sortPriority: 0,
      duration: fakeNow.getTime() - fake2MinutesAgo.getTime(),
      isMuted: false,
    });
  });

  it('handles active muted instances', () => {
    const alert = mockAlert({
      mutedInstanceIds: ['id'],
    });
    const start = fake2MinutesAgo;
    const instance: AlertInstanceStatus = {
      status: 'Active',
      muted: true,
      activeStartDate: fake2MinutesAgo.toISOString(),
    };

    expect(alertInstanceToListItem(fakeNow.getTime(), alert, 'id', instance)).toEqual({
      instance: 'id',
      status: { label: 'Active', healthColor: 'primary' },
      start,
      sortPriority: 0,
      duration: fakeNow.getTime() - fake2MinutesAgo.getTime(),
      isMuted: true,
    });
  });

  it('handles active instances with start date', () => {
    const alert = mockAlert();
    const instance: AlertInstanceStatus = {
      status: 'Active',
      muted: false,
    };

    expect(alertInstanceToListItem(fakeNow.getTime(), alert, 'id', instance)).toEqual({
      instance: 'id',
      status: { label: 'Active', healthColor: 'primary' },
      start: undefined,
      duration: 0,
      sortPriority: 0,
      isMuted: false,
    });
  });

  it('handles muted inactive instances', () => {
    const alert = mockAlert({
      mutedInstanceIds: ['id'],
    });
    const instance: AlertInstanceStatus = {
      status: 'OK',
      muted: true,
    };
    expect(alertInstanceToListItem(fakeNow.getTime(), alert, 'id', instance)).toEqual({
      instance: 'id',
      status: { label: 'OK', healthColor: 'subdued' },
      start: undefined,
      duration: 0,
      sortPriority: 1,
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
    executionStatus: {
      status: 'unknown',
      lastExecutionDate: new Date('2020-08-20T19:23:38Z'),
    },
    ...overloads,
  };
}

function mockAlertInstanceSummary(
  overloads: Partial<AlertInstanceSummary> = {}
): AlertInstanceSummary {
  const summary: AlertInstanceSummary = {
    id: 'alert-id',
    name: 'alert-name',
    tags: ['tag-1', 'tag-2'],
    alertTypeId: 'alert-type-id',
    consumer: 'alert-consumer',
    status: 'OK',
    muteAll: false,
    throttle: '',
    enabled: true,
    errorMessages: [],
    statusStartDate: fake2MinutesAgo.toISOString(),
    statusEndDate: fakeNow.toISOString(),
    instances: {
      foo: {
        status: 'OK',
        muted: false,
      },
    },
  };
  return { ...summary, ...overloads };
}
