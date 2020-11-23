/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import * as React from 'react';
import uuid from 'uuid';
import { shallow } from 'enzyme';
import { createMemoryHistory, createLocation } from 'history';
import { ToastsApi } from 'kibana/public';
import { AlertDetailsRoute, getAlertData } from './alert_details_route';
import { Alert } from '../../../../types';
import { EuiLoadingSpinner } from '@elastic/eui';

jest.mock('../../../app_context', () => {
  const toastNotifications = jest.fn();
  return {
    useAppDependencies: jest.fn(() => ({ toastNotifications })),
  };
});
describe('alert_details_route', () => {
  it('render a loader while fetching data', () => {
    const alert = mockAlert();

    expect(
      shallow(
        <AlertDetailsRoute {...mockRouterProps(alert)} {...mockApis()} />
      ).containsMatchingElement(<EuiLoadingSpinner size="l" />)
    ).toBeTruthy();
  });
});

describe('getAlertData useEffect handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('fetches alert', async () => {
    const alert = mockAlert();
    const { loadAlert, loadAlertTypes, loadActionTypes } = mockApis();
    const { setAlert, setAlertType, setActionTypes } = mockStateSetter();

    loadAlert.mockImplementationOnce(async () => alert);

    const toastNotifications = ({
      addDanger: jest.fn(),
    } as unknown) as ToastsApi;

    await getAlertData(
      alert.id,
      loadAlert,
      loadAlertTypes,
      loadActionTypes,
      setAlert,
      setAlertType,
      setActionTypes,
      toastNotifications
    );

    expect(loadAlert).toHaveBeenCalledWith(alert.id);
    expect(setAlert).toHaveBeenCalledWith(alert);
  });

  it('fetches alert and action types', async () => {
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
    const alertType = {
      id: alert.alertTypeId,
      name: 'type name',
    };
    const { loadAlert, loadAlertTypes, loadActionTypes } = mockApis();
    const { setAlert, setAlertType, setActionTypes } = mockStateSetter();

    loadAlert.mockImplementation(async () => alert);
    loadAlertTypes.mockImplementation(async () => [alertType]);
    loadActionTypes.mockImplementation(async () => [actionType]);

    const toastNotifications = ({
      addDanger: jest.fn(),
    } as unknown) as ToastsApi;

    await getAlertData(
      alert.id,
      loadAlert,
      loadAlertTypes,
      loadActionTypes,
      setAlert,
      setAlertType,
      setActionTypes,
      toastNotifications
    );

    expect(loadAlertTypes).toHaveBeenCalledTimes(1);
    expect(loadActionTypes).toHaveBeenCalledTimes(1);

    expect(setAlertType).toHaveBeenCalledWith(alertType);
    expect(setActionTypes).toHaveBeenCalledWith([actionType]);
  });

  it('displays an error if the alert isnt found', async () => {
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

    const { loadAlert, loadAlertTypes, loadActionTypes } = mockApis();
    const { setAlert, setAlertType, setActionTypes } = mockStateSetter();

    loadAlert.mockImplementation(async () => {
      throw new Error('OMG');
    });

    const toastNotifications = ({
      addDanger: jest.fn(),
    } as unknown) as ToastsApi;
    await getAlertData(
      alert.id,
      loadAlert,
      loadAlertTypes,
      loadActionTypes,
      setAlert,
      setAlertType,
      setActionTypes,
      toastNotifications
    );
    expect(toastNotifications.addDanger).toHaveBeenCalledTimes(1);
    expect(toastNotifications.addDanger).toHaveBeenCalledWith({
      title: 'Unable to load alert: OMG',
    });
  });

  it('displays an error if the alert type isnt loaded', async () => {
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

    const { loadAlert, loadAlertTypes, loadActionTypes } = mockApis();
    const { setAlert, setAlertType, setActionTypes } = mockStateSetter();

    loadAlert.mockImplementation(async () => alert);

    loadAlertTypes.mockImplementation(async () => {
      throw new Error('OMG no alert type');
    });
    loadActionTypes.mockImplementation(async () => [actionType]);

    const toastNotifications = ({
      addDanger: jest.fn(),
    } as unknown) as ToastsApi;
    await getAlertData(
      alert.id,
      loadAlert,
      loadAlertTypes,
      loadActionTypes,
      setAlert,
      setAlertType,
      setActionTypes,
      toastNotifications
    );
    expect(toastNotifications.addDanger).toHaveBeenCalledTimes(1);
    expect(toastNotifications.addDanger).toHaveBeenCalledWith({
      title: 'Unable to load alert: OMG no alert type',
    });
  });

  it('displays an error if the action type isnt loaded', async () => {
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
    const alertType = {
      id: alert.alertTypeId,
      name: 'type name',
    };

    const { loadAlert, loadAlertTypes, loadActionTypes } = mockApis();
    const { setAlert, setAlertType, setActionTypes } = mockStateSetter();

    loadAlert.mockImplementation(async () => alert);

    loadAlertTypes.mockImplementation(async () => [alertType]);
    loadActionTypes.mockImplementation(async () => {
      throw new Error('OMG no action type');
    });

    const toastNotifications = ({
      addDanger: jest.fn(),
    } as unknown) as ToastsApi;
    await getAlertData(
      alert.id,
      loadAlert,
      loadAlertTypes,
      loadActionTypes,
      setAlert,
      setAlertType,
      setActionTypes,
      toastNotifications
    );
    expect(toastNotifications.addDanger).toHaveBeenCalledTimes(1);
    expect(toastNotifications.addDanger).toHaveBeenCalledWith({
      title: 'Unable to load alert: OMG no action type',
    });
  });

  it('displays an error if the alert type isnt found', async () => {
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

    const alertType = {
      id: uuid.v4(),
      name: 'type name',
    };

    const { loadAlert, loadAlertTypes, loadActionTypes } = mockApis();
    const { setAlert, setAlertType, setActionTypes } = mockStateSetter();

    loadAlert.mockImplementation(async () => alert);
    loadAlertTypes.mockImplementation(async () => [alertType]);
    loadActionTypes.mockImplementation(async () => [actionType]);

    const toastNotifications = ({
      addDanger: jest.fn(),
    } as unknown) as ToastsApi;
    await getAlertData(
      alert.id,
      loadAlert,
      loadAlertTypes,
      loadActionTypes,
      setAlert,
      setAlertType,
      setActionTypes,
      toastNotifications
    );
    expect(toastNotifications.addDanger).toHaveBeenCalledTimes(1);
    expect(toastNotifications.addDanger).toHaveBeenCalledWith({
      title: `Unable to load alert: Invalid Alert Type: ${alert.alertTypeId}`,
    });
  });

  it('displays an error if an action type isnt found', async () => {
    const availableActionType = {
      id: '.server-log',
      name: 'Server log',
      enabled: true,
    };
    const missingActionType = {
      id: '.noop',
      name: 'No Op',
      enabled: true,
    };
    const alert = mockAlert({
      actions: [
        {
          group: '',
          id: uuid.v4(),
          actionTypeId: availableActionType.id,
          params: {},
        },
        {
          group: '',
          id: uuid.v4(),
          actionTypeId: missingActionType.id,
          params: {},
        },
      ],
    });

    const alertType = {
      id: uuid.v4(),
      name: 'type name',
    };

    const { loadAlert, loadAlertTypes, loadActionTypes } = mockApis();
    const { setAlert, setAlertType, setActionTypes } = mockStateSetter();

    loadAlert.mockImplementation(async () => alert);
    loadAlertTypes.mockImplementation(async () => [alertType]);
    loadActionTypes.mockImplementation(async () => [availableActionType]);

    const toastNotifications = ({
      addDanger: jest.fn(),
    } as unknown) as ToastsApi;
    await getAlertData(
      alert.id,
      loadAlert,
      loadAlertTypes,
      loadActionTypes,
      setAlert,
      setAlertType,
      setActionTypes,
      toastNotifications
    );
    expect(toastNotifications.addDanger).toHaveBeenCalledTimes(1);
    expect(toastNotifications.addDanger).toHaveBeenCalledWith({
      title: `Unable to load alert: Invalid Action Type: ${missingActionType.id}`,
    });
  });
});

function mockApis() {
  return {
    loadAlert: jest.fn(),
    loadAlertTypes: jest.fn(),
    loadActionTypes: jest.fn(),
  };
}

function mockStateSetter() {
  return {
    setAlert: jest.fn(),
    setAlertType: jest.fn(),
    setActionTypes: jest.fn(),
  };
}

function mockRouterProps(alert: Alert) {
  return {
    match: {
      isExact: false,
      path: `/alert/${alert.id}`,
      url: '',
      params: { alertId: alert.id },
    },
    history: createMemoryHistory(),
    location: createLocation(`/alert/${alert.id}`),
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
    notifyOnlyOnActionGroupChange: false,
    muteAll: false,
    mutedInstanceIds: [],
    executionStatus: {
      status: 'unknown',
      lastExecutionDate: new Date('2020-08-20T19:23:38Z'),
    },
    ...overloads,
  };
}
