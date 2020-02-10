/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import * as React from 'react';
import uuid from 'uuid';
import { shallow } from 'enzyme';
import { ToastsApi } from 'kibana/public';
import { AlertInstancesRoute, getAlertState } from './alert_instances_route';
import { Alert } from '../../../../types';
import { EuiLoadingSpinner } from '@elastic/eui';

jest.mock('../../../app_context', () => {
  const toastNotifications = jest.fn();
  return {
    useAppDependencies: jest.fn(() => ({ toastNotifications })),
  };
});
describe('alert_state_route', () => {
  it('render a loader while fetching data', () => {
    const alert = mockAlert();

    expect(
      shallow(<AlertInstancesRoute alert={alert} {...mockApis()} />).containsMatchingElement(
        <EuiLoadingSpinner size="l" />
      )
    ).toBeTruthy();
  });
});

describe('getAlertState useEffect handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('fetches alert state', async () => {
    const alert = mockAlert();
    const alertState = mockAlertState();
    const { loadAlertState } = mockApis();
    const { setAlertState } = mockStateSetter();

    loadAlertState.mockImplementationOnce(async () => alertState);

    const toastNotifications = ({
      addDanger: jest.fn(),
    } as unknown) as ToastsApi;

    await getAlertState(alert.id, loadAlertState, setAlertState, toastNotifications);

    expect(loadAlertState).toHaveBeenCalledWith(alert.id);
    expect(setAlertState).toHaveBeenCalledWith(alertState);
  });

  it('displays an error if the alert state isnt found', async () => {
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

    const { loadAlertState } = mockApis();
    const { setAlertState } = mockStateSetter();

    loadAlertState.mockImplementation(async () => {
      throw new Error('OMG');
    });

    const toastNotifications = ({
      addDanger: jest.fn(),
    } as unknown) as ToastsApi;
    await getAlertState(alert.id, loadAlertState, setAlertState, toastNotifications);
    expect(toastNotifications.addDanger).toHaveBeenCalledTimes(1);
    expect(toastNotifications.addDanger).toHaveBeenCalledWith({
      title: 'Unable to load alert state: OMG',
    });
  });
});

function mockApis() {
  return {
    loadAlertState: jest.fn(),
    requestRefresh: jest.fn(),
  };
}

function mockStateSetter() {
  return {
    setAlertState: jest.fn(),
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

function mockAlertState(overloads: Partial<any> = {}): any {
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
  };
}
