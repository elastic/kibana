/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import * as React from 'react';
import uuid from 'uuid';
import { shallow } from 'enzyme';
import { ToastsApi } from 'kibana/public';
import { AlertInstancesRoute, getAlertStatus } from './alert_instances_route';
import { Alert, AlertStatus } from '../../../../types';
import { EuiLoadingSpinner } from '@elastic/eui';

const fakeNow = new Date('2020-02-09T23:15:41.941Z');
const fake2MinutesAgo = new Date('2020-02-09T23:13:41.941Z');

jest.mock('../../../app_context', () => {
  const toastNotifications = jest.fn();
  return {
    useAppDependencies: jest.fn(() => ({ toastNotifications })),
  };
});
describe('alert_status_route', () => {
  it('render a loader while fetching data', () => {
    const alert = mockAlert();

    expect(
      shallow(
        <AlertInstancesRoute readOnly={false} alert={alert} {...mockApis()} />
      ).containsMatchingElement(<EuiLoadingSpinner size="l" />)
    ).toBeTruthy();
  });
});

describe('getAlertState useEffect handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('fetches alert status', async () => {
    const alert = mockAlert();
    const alertStatus = mockAlertStatus();
    const { loadAlertStatus } = mockApis();
    const { setAlertStatus } = mockStateSetter();

    loadAlertStatus.mockImplementationOnce(async () => alertStatus);

    const toastNotifications = ({
      addDanger: jest.fn(),
    } as unknown) as ToastsApi;

    await getAlertStatus(alert.id, loadAlertStatus, setAlertStatus, toastNotifications);

    expect(loadAlertStatus).toHaveBeenCalledWith(alert.id);
    expect(setAlertStatus).toHaveBeenCalledWith(alertStatus);
  });

  it('displays an error if the alert status isnt found', async () => {
    const actionType = {
      id: '.server-log',
      name: 'Server log',
      enabled: true,
    };
    const alert = mockAlert({
      actions: [
        {
          group: '',
          id: uuid.v4(),
          actionTypeId: actionType.id,
          params: {},
        },
      ],
    });

    const { loadAlertStatus } = mockApis();
    const { setAlertStatus } = mockStateSetter();

    loadAlertStatus.mockImplementation(async () => {
      throw new Error('OMG');
    });

    const toastNotifications = ({
      addDanger: jest.fn(),
    } as unknown) as ToastsApi;
    await getAlertStatus(alert.id, loadAlertStatus, setAlertStatus, toastNotifications);
    expect(toastNotifications.addDanger).toHaveBeenCalledTimes(1);
    expect(toastNotifications.addDanger).toHaveBeenCalledWith({
      title: 'Unable to load alert status: OMG',
    });
  });
});

function mockApis() {
  return {
    loadAlertStatus: jest.fn(),
    requestRefresh: jest.fn(),
  };
}

function mockStateSetter() {
  return {
    setAlertStatus: jest.fn(),
  };
}

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

function mockAlertStatus(overloads: Partial<any> = {}): any {
  const status: AlertStatus = {
    id: 'alert-id',
    name: 'alert-name',
    tags: ['tag-1', 'tag-2'],
    alertTypeId: 'alert-type-id',
    consumer: 'alert-consumer',
    status: 'OK',
    muteAll: false,
    throttle: null,
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
  return status;
}
