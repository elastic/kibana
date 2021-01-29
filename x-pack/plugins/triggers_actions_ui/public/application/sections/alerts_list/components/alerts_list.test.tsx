/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import * as React from 'react';

import { mountWithIntl, nextTick } from '@kbn/test/jest';
import { ReactWrapper } from 'enzyme';
import { act } from 'react-dom/test-utils';
import { actionTypeRegistryMock } from '../../../action_type_registry.mock';
import { alertTypeRegistryMock } from '../../../alert_type_registry.mock';
import { AlertsList } from './alerts_list';
import { ValidationResult } from '../../../../types';
import {
  AlertExecutionStatusErrorReasons,
  ALERTS_FEATURE_ID,
} from '../../../../../../alerts/common';
import { useKibana } from '../../../../common/lib/kibana';
jest.mock('../../../../common/lib/kibana');

jest.mock('../../../lib/action_connector_api', () => ({
  loadActionTypes: jest.fn(),
  loadAllActions: jest.fn(),
}));
jest.mock('../../../lib/alert_api', () => ({
  loadAlerts: jest.fn(),
  loadAlertTypes: jest.fn(),
  alertingFrameworkHealth: jest.fn(() => ({
    isSufficientlySecure: true,
    hasPermanentEncryptionKey: true,
  })),
}));
jest.mock('../../../../common/lib/health_api', () => ({
  triggersActionsUiHealth: jest.fn(() => ({ isAlertsAvailable: true })),
}));
jest.mock('react-router-dom', () => ({
  useHistory: () => ({
    push: jest.fn(),
  }),
  useLocation: () => ({
    pathname: '/triggersActions/alerts/',
  }),
}));
const { loadAlerts, loadAlertTypes } = jest.requireMock('../../../lib/alert_api');
const { loadActionTypes, loadAllActions } = jest.requireMock('../../../lib/action_connector_api');
const actionTypeRegistry = actionTypeRegistryMock.create();
const alertTypeRegistry = alertTypeRegistryMock.create();

const alertType = {
  id: 'test_alert_type',
  description: 'test',
  iconClass: 'test',
  documentationUrl: null,
  validate: (): ValidationResult => {
    return { errors: {} };
  },
  alertParamsExpression: () => null,
  requiresAppContext: false,
};
const alertTypeFromApi = {
  id: 'test_alert_type',
  name: 'some alert type',
  actionGroups: [{ id: 'default', name: 'Default' }],
  recoveryActionGroup: { id: 'recovered', name: 'Recovered' },
  actionVariables: { context: [], state: [] },
  defaultActionGroupId: 'default',
  producer: ALERTS_FEATURE_ID,
  minimumLicenseRequired: 'basic',
  authorizedConsumers: {
    [ALERTS_FEATURE_ID]: { read: true, all: true },
  },
};
alertTypeRegistry.list.mockReturnValue([alertType]);
actionTypeRegistry.list.mockReturnValue([]);
const useKibanaMock = useKibana as jest.Mocked<typeof useKibana>;

describe('alerts_list component empty', () => {
  let wrapper: ReactWrapper<any>;
  async function setup() {
    loadAlerts.mockResolvedValue({
      page: 1,
      perPage: 10000,
      total: 0,
      data: [],
    });
    loadActionTypes.mockResolvedValue([
      {
        id: 'test',
        name: 'Test',
      },
      {
        id: 'test2',
        name: 'Test2',
      },
    ]);
    loadAlertTypes.mockResolvedValue([alertTypeFromApi]);
    loadAllActions.mockResolvedValue([]);

    // eslint-disable-next-line react-hooks/rules-of-hooks
    useKibanaMock().services.alertTypeRegistry = alertTypeRegistry;

    // eslint-disable-next-line react-hooks/rules-of-hooks
    useKibanaMock().services.actionTypeRegistry = actionTypeRegistry;

    wrapper = mountWithIntl(<AlertsList />);

    await act(async () => {
      await nextTick();
      wrapper.update();
    });
  }

  it('renders empty list', async () => {
    await setup();
    expect(wrapper.find('[data-test-subj="createFirstAlertEmptyPrompt"]').exists()).toBeTruthy();
  });

  it('renders Create alert button', async () => {
    await setup();
    expect(
      wrapper.find('[data-test-subj="createFirstAlertButton"]').find('EuiButton')
    ).toHaveLength(1);
    expect(wrapper.find('AlertAdd').exists()).toBeFalsy();

    wrapper.find('button[data-test-subj="createFirstAlertButton"]').simulate('click');

    // When the AlertAdd component is rendered, it waits for the healthcheck to resolve
    await new Promise((resolve) => {
      setTimeout(resolve, 1000);
    });
    wrapper.update();
    expect(wrapper.find('AlertAdd').exists()).toEqual(true);
  });
});

describe('alerts_list component with items', () => {
  let wrapper: ReactWrapper<any>;

  async function setup() {
    loadAlerts.mockResolvedValue({
      page: 1,
      perPage: 10000,
      total: 4,
      data: [
        {
          id: '1',
          name: 'test alert',
          tags: ['tag1'],
          enabled: true,
          alertTypeId: 'test_alert_type',
          schedule: { interval: '5d' },
          actions: [],
          params: { name: 'test alert type name' },
          scheduledTaskId: null,
          createdBy: null,
          updatedBy: null,
          apiKeyOwner: null,
          throttle: '1m',
          muteAll: false,
          mutedInstanceIds: [],
          executionStatus: {
            status: 'active',
            lastExecutionDate: new Date('2020-08-20T19:23:38Z'),
            error: null,
          },
        },
        {
          id: '2',
          name: 'test alert ok',
          tags: ['tag1'],
          enabled: true,
          alertTypeId: 'test_alert_type',
          schedule: { interval: '5d' },
          actions: [],
          params: { name: 'test alert type name' },
          scheduledTaskId: null,
          createdBy: null,
          updatedBy: null,
          apiKeyOwner: null,
          throttle: '1m',
          muteAll: false,
          mutedInstanceIds: [],
          executionStatus: {
            status: 'ok',
            lastExecutionDate: new Date('2020-08-20T19:23:38Z'),
            error: null,
          },
        },
        {
          id: '3',
          name: 'test alert pending',
          tags: ['tag1'],
          enabled: true,
          alertTypeId: 'test_alert_type',
          schedule: { interval: '5d' },
          actions: [],
          params: { name: 'test alert type name' },
          scheduledTaskId: null,
          createdBy: null,
          updatedBy: null,
          apiKeyOwner: null,
          throttle: '1m',
          muteAll: false,
          mutedInstanceIds: [],
          executionStatus: {
            status: 'pending',
            lastExecutionDate: new Date('2020-08-20T19:23:38Z'),
            error: null,
          },
        },
        {
          id: '4',
          name: 'test alert error',
          tags: ['tag1'],
          enabled: true,
          alertTypeId: 'test_alert_type',
          schedule: { interval: '5d' },
          actions: [{ id: 'test', group: 'alert', params: { message: 'test' } }],
          params: { name: 'test alert type name' },
          scheduledTaskId: null,
          createdBy: null,
          updatedBy: null,
          apiKeyOwner: null,
          throttle: '1m',
          muteAll: false,
          mutedInstanceIds: [],
          executionStatus: {
            status: 'error',
            lastExecutionDate: new Date('2020-08-20T19:23:38Z'),
            error: {
              reason: AlertExecutionStatusErrorReasons.Unknown,
              message: 'test',
            },
          },
        },
      ],
    });
    loadActionTypes.mockResolvedValue([
      {
        id: 'test',
        name: 'Test',
      },
      {
        id: 'test2',
        name: 'Test2',
      },
    ]);
    loadAlertTypes.mockResolvedValue([alertTypeFromApi]);
    loadAllActions.mockResolvedValue([]);

    alertTypeRegistry.has.mockReturnValue(true);
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useKibanaMock().services.alertTypeRegistry = alertTypeRegistry;

    // eslint-disable-next-line react-hooks/rules-of-hooks
    useKibanaMock().services.actionTypeRegistry = actionTypeRegistry;
    wrapper = mountWithIntl(<AlertsList />);

    await act(async () => {
      await nextTick();
      wrapper.update();
    });

    expect(loadAlerts).toHaveBeenCalled();
    expect(loadActionTypes).toHaveBeenCalled();
  }

  it('renders table of alerts', async () => {
    await setup();
    expect(wrapper.find('EuiBasicTable')).toHaveLength(1);
    expect(wrapper.find('EuiTableRow')).toHaveLength(4);
    expect(wrapper.find('[data-test-subj="alertsTableCell-status"]').length).toBeGreaterThan(0);
    expect(wrapper.find('[data-test-subj="alertStatus-active"]').length).toBeGreaterThan(0);
    expect(wrapper.find('[data-test-subj="alertStatus-error"]').length).toBeGreaterThan(0);
    expect(wrapper.find('[data-test-subj="alertStatus-ok"]').length).toBeGreaterThan(0);
    expect(wrapper.find('[data-test-subj="alertStatus-pending"]').length).toBeGreaterThan(0);
    expect(wrapper.find('[data-test-subj="alertStatus-unknown"]').length).toBe(0);
    expect(wrapper.find('[data-test-subj="refreshAlertsButton"]').exists()).toBeTruthy();
  });

  it('loads alerts when refresh button is clicked', async () => {
    await setup();
    wrapper.find('[data-test-subj="refreshAlertsButton"]').first().simulate('click');
    expect(loadAlerts).toHaveBeenCalled();
  });
});

describe('alerts_list component empty with show only capability', () => {
  let wrapper: ReactWrapper<any>;

  async function setup() {
    loadAlerts.mockResolvedValue({
      page: 1,
      perPage: 10000,
      total: 0,
      data: [],
    });
    loadActionTypes.mockResolvedValue([
      {
        id: 'test',
        name: 'Test',
      },
      {
        id: 'test2',
        name: 'Test2',
      },
    ]);
    loadAlertTypes.mockResolvedValue([{ id: 'test_alert_type', name: 'some alert type' }]);
    loadAllActions.mockResolvedValue([]);
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useKibanaMock().services.alertTypeRegistry = alertTypeRegistry;

    // eslint-disable-next-line react-hooks/rules-of-hooks
    useKibanaMock().services.actionTypeRegistry = actionTypeRegistry;
    wrapper = mountWithIntl(<AlertsList />);

    await act(async () => {
      await nextTick();
      wrapper.update();
    });
  }

  it('not renders create alert button', async () => {
    await setup();
    expect(wrapper.find('[data-test-subj="createAlertButton"]')).toHaveLength(0);
  });
});

describe('alerts_list with show only capability', () => {
  let wrapper: ReactWrapper<any>;

  async function setup() {
    loadAlerts.mockResolvedValue({
      page: 1,
      perPage: 10000,
      total: 2,
      data: [
        {
          id: '1',
          name: 'test alert',
          tags: ['tag1'],
          enabled: true,
          alertTypeId: 'test_alert_type',
          schedule: { interval: '5d' },
          actions: [],
          params: { name: 'test alert type name' },
          scheduledTaskId: null,
          createdBy: null,
          updatedBy: null,
          apiKeyOwner: null,
          throttle: '1m',
          muteAll: false,
          mutedInstanceIds: [],
          executionStatus: {
            status: 'active',
            lastExecutionDate: new Date('2020-08-20T19:23:38Z'),
            error: null,
          },
        },
        {
          id: '2',
          name: 'test alert 2',
          tags: ['tag1'],
          enabled: true,
          alertTypeId: 'test_alert_type',
          schedule: { interval: '5d' },
          actions: [{ id: 'test', group: 'alert', params: { message: 'test' } }],
          params: { name: 'test alert type name' },
          scheduledTaskId: null,
          createdBy: null,
          updatedBy: null,
          apiKeyOwner: null,
          throttle: '1m',
          muteAll: false,
          mutedInstanceIds: [],
          executionStatus: {
            status: 'active',
            lastExecutionDate: new Date('2020-08-20T19:23:38Z'),
            error: null,
          },
        },
      ],
    });
    loadActionTypes.mockResolvedValue([
      {
        id: 'test',
        name: 'Test',
      },
      {
        id: 'test2',
        name: 'Test2',
      },
    ]);

    loadAlertTypes.mockResolvedValue([alertTypeFromApi]);
    loadAllActions.mockResolvedValue([]);

    alertTypeRegistry.has.mockReturnValue(false);
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useKibanaMock().services.alertTypeRegistry = alertTypeRegistry;

    // eslint-disable-next-line react-hooks/rules-of-hooks
    useKibanaMock().services.actionTypeRegistry = actionTypeRegistry;
    wrapper = mountWithIntl(<AlertsList />);

    await act(async () => {
      await nextTick();
      wrapper.update();
    });
  }

  it('renders table of alerts with delete button disabled', async () => {
    await setup();
    expect(wrapper.find('EuiBasicTable')).toHaveLength(1);
    expect(wrapper.find('EuiTableRow')).toHaveLength(2);
    // TODO: check delete button
  });
});
