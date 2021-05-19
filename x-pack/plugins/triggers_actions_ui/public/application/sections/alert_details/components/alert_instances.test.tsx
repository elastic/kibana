/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as React from 'react';
import uuid from 'uuid';
import { shallow } from 'enzyme';
import { AlertInstances, AlertInstanceListItem, alertInstanceToListItem } from './alert_instances';
import { Alert, AlertInstanceSummary, AlertInstanceStatus, AlertType } from '../../../../types';
import { EuiBasicTable } from '@elastic/eui';
jest.mock('../../../../common/lib/kibana');

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

describe('alert_instances', () => {
  it('render a list of alert instances', () => {
    const alert = mockAlert();
    const alertType = mockAlertType();
    const alertInstanceSummary = mockAlertInstanceSummary({
      instances: {
        first_instance: {
          status: 'OK',
          muted: false,
          actionGroupId: 'default',
        },
        second_instance: {
          status: 'Active',
          muted: false,
          actionGroupId: 'action group id unknown',
        },
      },
    });

    const instances: AlertInstanceListItem[] = [
      // active first
      alertInstanceToListItem(
        fakeNow.getTime(),
        alertType,
        'second_instance',
        alertInstanceSummary.instances.second_instance
      ),
      // ok second
      alertInstanceToListItem(
        fakeNow.getTime(),
        alertType,
        'first_instance',
        alertInstanceSummary.instances.first_instance
      ),
    ];

    expect(
      shallow(
        <AlertInstances
          {...mockAPIs}
          alert={alert}
          alertType={alertType}
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
    const alertType = mockAlertType();
    const alertInstanceSummary = mockAlertInstanceSummary();

    expect(
      shallow(
        <AlertInstances
          durationEpoch={fake2MinutesAgo.getTime()}
          {...mockAPIs}
          alert={alert}
          alertType={alertType}
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
    const alertType = mockAlertType();
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
          alertType={alertType}
          readOnly={false}
          alertInstanceSummary={mockAlertInstanceSummary({
            instances,
          })}
        />
      )
        .find(EuiBasicTable)
        .prop('items')
    ).toEqual([
      alertInstanceToListItem(fakeNow.getTime(), alertType, 'us-central', instances['us-central']),
      alertInstanceToListItem(fakeNow.getTime(), alertType, 'us-east', instances['us-east']),
    ]);
  });

  it('render all inactive alert instances', () => {
    const alert = mockAlert({
      mutedInstanceIds: ['us-west', 'us-east'],
    });
    const alertType = mockAlertType();
    const instanceUsWest: AlertInstanceStatus = { status: 'OK', muted: false };
    const instanceUsEast: AlertInstanceStatus = { status: 'OK', muted: false };

    expect(
      shallow(
        <AlertInstances
          {...mockAPIs}
          alert={alert}
          alertType={alertType}
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
      alertInstanceToListItem(fakeNow.getTime(), alertType, 'us-west', instanceUsWest),
      alertInstanceToListItem(fakeNow.getTime(), alertType, 'us-east', instanceUsEast),
    ]);
  });
});

describe('alertInstanceToListItem', () => {
  it('handles active instances', () => {
    const alertType = mockAlertType({
      actionGroups: [
        { id: 'default', name: 'Default Action Group' },
        { id: 'testing', name: 'Test Action Group' },
      ],
    });
    const start = fake2MinutesAgo;
    const instance: AlertInstanceStatus = {
      status: 'Active',
      muted: false,
      activeStartDate: fake2MinutesAgo.toISOString(),
      actionGroupId: 'testing',
    };

    expect(alertInstanceToListItem(fakeNow.getTime(), alertType, 'id', instance)).toEqual({
      instance: 'id',
      status: { label: 'Active', actionGroup: 'Test Action Group', healthColor: 'primary' },
      start,
      sortPriority: 0,
      duration: fakeNow.getTime() - fake2MinutesAgo.getTime(),
      isMuted: false,
    });
  });

  it('handles active instances with no action group id', () => {
    const alertType = mockAlertType();
    const start = fake2MinutesAgo;
    const instance: AlertInstanceStatus = {
      status: 'Active',
      muted: false,
      activeStartDate: fake2MinutesAgo.toISOString(),
    };

    expect(alertInstanceToListItem(fakeNow.getTime(), alertType, 'id', instance)).toEqual({
      instance: 'id',
      status: { label: 'Active', actionGroup: 'Default Action Group', healthColor: 'primary' },
      start,
      sortPriority: 0,
      duration: fakeNow.getTime() - fake2MinutesAgo.getTime(),
      isMuted: false,
    });
  });

  it('handles active muted instances', () => {
    const alertType = mockAlertType();
    const start = fake2MinutesAgo;
    const instance: AlertInstanceStatus = {
      status: 'Active',
      muted: true,
      activeStartDate: fake2MinutesAgo.toISOString(),
      actionGroupId: 'default',
    };

    expect(alertInstanceToListItem(fakeNow.getTime(), alertType, 'id', instance)).toEqual({
      instance: 'id',
      status: { label: 'Active', actionGroup: 'Default Action Group', healthColor: 'primary' },
      start,
      sortPriority: 0,
      duration: fakeNow.getTime() - fake2MinutesAgo.getTime(),
      isMuted: true,
    });
  });

  it('handles active instances with start date', () => {
    const alertType = mockAlertType();
    const instance: AlertInstanceStatus = {
      status: 'Active',
      muted: false,
      actionGroupId: 'default',
    };

    expect(alertInstanceToListItem(fakeNow.getTime(), alertType, 'id', instance)).toEqual({
      instance: 'id',
      status: { label: 'Active', actionGroup: 'Default Action Group', healthColor: 'primary' },
      start: undefined,
      duration: 0,
      sortPriority: 0,
      isMuted: false,
    });
  });

  it('handles muted inactive instances', () => {
    const alertType = mockAlertType();
    const instance: AlertInstanceStatus = {
      status: 'OK',
      muted: true,
      actionGroupId: 'default',
    };
    expect(alertInstanceToListItem(fakeNow.getTime(), alertType, 'id', instance)).toEqual({
      instance: 'id',
      status: { label: 'Recovered', healthColor: 'subdued' },
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
    notifyWhen: null,
    muteAll: false,
    mutedInstanceIds: [],
    executionStatus: {
      status: 'unknown',
      lastExecutionDate: new Date('2020-08-20T19:23:38Z'),
    },
    ...overloads,
  };
}

function mockAlertType(overloads: Partial<AlertType> = {}): AlertType {
  return {
    id: 'test.testAlertType',
    name: 'My Test Alert Type',
    actionGroups: [{ id: 'default', name: 'Default Action Group' }],
    actionVariables: {
      context: [],
      state: [],
      params: [],
    },
    defaultActionGroupId: 'default',
    recoveryActionGroup: { id: 'recovered', name: 'Recovered' },
    authorizedConsumers: {},
    producer: 'alerts',
    minimumLicenseRequired: 'basic',
    enabledInLicense: true,
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
        actionGroupId: 'testActionGroup',
      },
    },
  };
  return { ...summary, ...overloads };
}
