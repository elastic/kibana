/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as React from 'react';
import uuid from 'uuid';
import { shallow } from 'enzyme';
import { ToastsApi } from 'kibana/public';
import { AlertInstancesRoute, getAlertInstanceSummary } from './alert_instances_route';
import { Alert, AlertInstanceSummary, AlertType } from '../../../../types';
import { CenterJustifiedSpinner } from '../../../components/center_justified_spinner';
jest.mock('../../../../common/lib/kibana');

const fakeNow = new Date('2020-02-09T23:15:41.941Z');
const fake2MinutesAgo = new Date('2020-02-09T23:13:41.941Z');

describe('alert_instance_summary_route', () => {
  it('render a loader while fetching data', () => {
    const alert = mockAlert();
    const alertType = mockAlertType();

    expect(
      shallow(
        <AlertInstancesRoute readOnly={false} alert={alert} alertType={alertType} {...mockApis()} />
      ).containsMatchingElement(<CenterJustifiedSpinner />)
    ).toBeTruthy();
  });
});

describe('getAlertState useEffect handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('fetches alert instance summary', async () => {
    const alert = mockAlert();
    const alertInstanceSummary = mockAlertInstanceSummary();
    const { loadAlertInstanceSummary } = mockApis();
    const { setAlertInstanceSummary } = mockStateSetter();

    loadAlertInstanceSummary.mockImplementationOnce(async () => alertInstanceSummary);

    const toastNotifications = {
      addDanger: jest.fn(),
    } as unknown as ToastsApi;

    await getAlertInstanceSummary(
      alert.id,
      loadAlertInstanceSummary,
      setAlertInstanceSummary,
      toastNotifications
    );

    expect(loadAlertInstanceSummary).toHaveBeenCalledWith(alert.id);
    expect(setAlertInstanceSummary).toHaveBeenCalledWith(alertInstanceSummary);
  });

  it('displays an error if the alert instance summary isnt found', async () => {
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

    const { loadAlertInstanceSummary } = mockApis();
    const { setAlertInstanceSummary } = mockStateSetter();

    loadAlertInstanceSummary.mockImplementation(async () => {
      throw new Error('OMG');
    });

    const toastNotifications = {
      addDanger: jest.fn(),
    } as unknown as ToastsApi;
    await getAlertInstanceSummary(
      alert.id,
      loadAlertInstanceSummary,
      setAlertInstanceSummary,
      toastNotifications
    );
    expect(toastNotifications.addDanger).toHaveBeenCalledTimes(1);
    expect(toastNotifications.addDanger).toHaveBeenCalledWith({
      title: 'Unable to load alerts: OMG',
    });
  });
});

function mockApis() {
  return {
    loadAlertInstanceSummary: jest.fn(),
    requestRefresh: jest.fn(),
  };
}

function mockStateSetter() {
  return {
    setAlertInstanceSummary: jest.fn(),
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

function mockAlertInstanceSummary(overloads: Partial<any> = {}): any {
  const summary: AlertInstanceSummary = {
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
  return summary;
}
