/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import * as React from 'react';
import { ScopedHistory } from 'kibana/public';

import { mountWithIntl, nextTick } from 'test_utils/enzyme_helpers';
import { coreMock, scopedHistoryMock } from '../../../../../../../../src/core/public/mocks';
import { ReactWrapper } from 'enzyme';
import { act } from 'react-dom/test-utils';
import { actionTypeRegistryMock } from '../../../action_type_registry.mock';
import { alertTypeRegistryMock } from '../../../alert_type_registry.mock';
import { AlertsList } from './alerts_list';
import { ValidationResult } from '../../../../types';
import { AppContextProvider } from '../../../app_context';
import { chartPluginMock } from '../../../../../../../../src/plugins/charts/public/mocks';
import { dataPluginMock } from '../../../../../../../../src/plugins/data/public/mocks';
import { alertingPluginMock } from '../../../../../../alerts/public/mocks';

jest.mock('../../../lib/action_connector_api', () => ({
  loadActionTypes: jest.fn(),
  loadAllActions: jest.fn(),
}));
jest.mock('../../../lib/alert_api', () => ({
  loadAlerts: jest.fn(),
  loadAlertTypes: jest.fn(),
}));
jest.mock('react-router-dom', () => ({
  useHistory: () => ({
    push: jest.fn(),
  }),
  useLocation: () => ({
    pathname: '/triggersActions/alerts/',
  }),
}));
const actionTypeRegistry = actionTypeRegistryMock.create();
const alertTypeRegistry = alertTypeRegistryMock.create();

const alertType = {
  id: 'test_alert_type',
  name: 'some alert type',
  iconClass: 'test',
  validate: (): ValidationResult => {
    return { errors: {} };
  },
  alertParamsExpression: () => null,
  requiresAppContext: false,
};
alertTypeRegistry.list.mockReturnValue([alertType]);
actionTypeRegistry.list.mockReturnValue([]);

describe('alerts_list component empty', () => {
  let wrapper: ReactWrapper<any>;
  async function setup() {
    const { loadAlerts, loadAlertTypes } = jest.requireMock('../../../lib/alert_api');
    const { loadActionTypes, loadAllActions } = jest.requireMock(
      '../../../lib/action_connector_api'
    );
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

    const mockes = coreMock.createSetup();
    const [
      {
        chrome,
        docLinks,
        application: { capabilities, navigateToApp },
      },
    ] = await mockes.getStartServices();
    const deps = {
      chrome,
      docLinks,
      dataPlugin: dataPluginMock.createStartContract(),
      charts: chartPluginMock.createStartContract(),
      alerting: alertingPluginMock.createStartContract(),
      toastNotifications: mockes.notifications.toasts,
      http: mockes.http,
      uiSettings: mockes.uiSettings,
      navigateToApp,
      capabilities: {
        ...capabilities,
        securitySolution: {
          'alerting:show': true,
          'alerting:save': true,
          'alerting:delete': true,
        },
      },
      history: (scopedHistoryMock.create() as unknown) as ScopedHistory,
      setBreadcrumbs: jest.fn(),
      actionTypeRegistry: actionTypeRegistry as any,
      alertTypeRegistry: alertTypeRegistry as any,
    };

    wrapper = mountWithIntl(
      <AppContextProvider appDeps={deps}>
        <AlertsList />
      </AppContextProvider>
    );

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
    expect(wrapper.find('AlertAdd')).toHaveLength(1);
  });
});

describe('alerts_list component with items', () => {
  let wrapper: ReactWrapper<any>;

  async function setup() {
    const { loadAlerts, loadAlertTypes } = jest.requireMock('../../../lib/alert_api');
    const { loadActionTypes, loadAllActions } = jest.requireMock(
      '../../../lib/action_connector_api'
    );
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
    loadAlertTypes.mockResolvedValue([{ id: 'test_alert_type', name: 'some alert type' }]);
    loadAllActions.mockResolvedValue([]);
    const mockes = coreMock.createSetup();
    const [
      {
        chrome,
        docLinks,
        application: { capabilities, navigateToApp },
      },
    ] = await mockes.getStartServices();
    const deps = {
      chrome,
      docLinks,
      dataPlugin: dataPluginMock.createStartContract(),
      charts: chartPluginMock.createStartContract(),
      alerting: alertingPluginMock.createStartContract(),
      toastNotifications: mockes.notifications.toasts,
      http: mockes.http,
      uiSettings: mockes.uiSettings,
      navigateToApp,
      capabilities: {
        ...capabilities,
        securitySolution: {
          'alerting:show': true,
          'alerting:save': true,
          'alerting:delete': true,
        },
      },
      history: (scopedHistoryMock.create() as unknown) as ScopedHistory,
      setBreadcrumbs: jest.fn(),
      actionTypeRegistry: actionTypeRegistry as any,
      alertTypeRegistry: alertTypeRegistry as any,
    };

    alertTypeRegistry.has.mockReturnValue(true);

    wrapper = mountWithIntl(
      <AppContextProvider appDeps={deps}>
        <AlertsList />
      </AppContextProvider>
    );

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
    expect(wrapper.find('EuiTableRow')).toHaveLength(2);
  });
});

describe('alerts_list component empty with show only capability', () => {
  let wrapper: ReactWrapper<any>;

  async function setup() {
    const { loadAlerts, loadAlertTypes } = jest.requireMock('../../../lib/alert_api');
    const { loadActionTypes, loadAllActions } = jest.requireMock(
      '../../../lib/action_connector_api'
    );
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
    const mockes = coreMock.createSetup();
    const [
      {
        chrome,
        docLinks,
        application: { capabilities, navigateToApp },
      },
    ] = await mockes.getStartServices();
    const deps = {
      chrome,
      docLinks,
      dataPlugin: dataPluginMock.createStartContract(),
      charts: chartPluginMock.createStartContract(),
      alerting: alertingPluginMock.createStartContract(),
      toastNotifications: mockes.notifications.toasts,
      http: mockes.http,
      uiSettings: mockes.uiSettings,
      navigateToApp,
      capabilities: {
        ...capabilities,
        securitySolution: {
          'alerting:show': true,
          'alerting:save': false,
          'alerting:delete': false,
        },
      },
      history: (scopedHistoryMock.create() as unknown) as ScopedHistory,
      setBreadcrumbs: jest.fn(),
      actionTypeRegistry: {
        get() {
          return null;
        },
      } as any,
      alertTypeRegistry: {} as any,
    };

    wrapper = mountWithIntl(
      <AppContextProvider appDeps={deps}>
        <AlertsList />
      </AppContextProvider>
    );

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
    const { loadAlerts, loadAlertTypes } = jest.requireMock('../../../lib/alert_api');
    const { loadActionTypes, loadAllActions } = jest.requireMock(
      '../../../lib/action_connector_api'
    );
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
    loadAlertTypes.mockResolvedValue([{ id: 'test_alert_type', name: 'some alert type' }]);
    loadAllActions.mockResolvedValue([]);
    const mockes = coreMock.createSetup();
    const [
      {
        chrome,
        docLinks,
        application: { capabilities, navigateToApp },
      },
    ] = await mockes.getStartServices();
    const deps = {
      chrome,
      docLinks,
      dataPlugin: dataPluginMock.createStartContract(),
      charts: chartPluginMock.createStartContract(),
      alerting: alertingPluginMock.createStartContract(),
      toastNotifications: mockes.notifications.toasts,
      http: mockes.http,
      uiSettings: mockes.uiSettings,
      navigateToApp,
      capabilities: {
        ...capabilities,
        securitySolution: {
          'alerting:show': true,
          'alerting:save': false,
          'alerting:delete': false,
        },
      },
      history: (scopedHistoryMock.create() as unknown) as ScopedHistory,
      setBreadcrumbs: jest.fn(),
      actionTypeRegistry: actionTypeRegistry as any,
      alertTypeRegistry: alertTypeRegistry as any,
    };

    alertTypeRegistry.has.mockReturnValue(false);

    wrapper = mountWithIntl(
      <AppContextProvider appDeps={deps}>
        <AlertsList />
      </AppContextProvider>
    );

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
