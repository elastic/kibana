/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import * as React from 'react';
import { mountWithIntl, nextTick } from 'test_utils/enzyme_helpers';

import { ActionsConnectorsList } from './actions_connectors_list';
import { coreMock, scopedHistoryMock } from '../../../../../../../../src/core/public/mocks';
import { ReactWrapper } from 'enzyme';
import { act } from 'react-dom/test-utils';
import { actionTypeRegistryMock } from '../../../action_type_registry.mock';
import { AppContextProvider } from '../../../app_context';
import { chartPluginMock } from '../../../../../../../../src/plugins/charts/public/mocks';
import { dataPluginMock } from '../../../../../../../../src/plugins/data/public/mocks';
import { alertingPluginMock } from '../../../../../../alerts/public/mocks';

jest.mock('../../../lib/action_connector_api', () => ({
  loadAllActions: jest.fn(),
  loadActionTypes: jest.fn(),
}));

const actionTypeRegistry = actionTypeRegistryMock.create();

describe('actions_connectors_list component empty', () => {
  let wrapper: ReactWrapper<any>;

  async function setup() {
    const { loadAllActions, loadActionTypes } = jest.requireMock(
      '../../../lib/action_connector_api'
    );
    loadAllActions.mockResolvedValueOnce([]);
    loadActionTypes.mockResolvedValueOnce([
      {
        id: 'test',
        name: 'Test',
      },
      {
        id: 'test2',
        name: 'Test2',
      },
    ]);
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
        siem: {
          'actions:show': true,
          'actions:save': true,
          'actions:delete': true,
        },
      },
      history: scopedHistoryMock.create(),
      setBreadcrumbs: jest.fn(),
      actionTypeRegistry: actionTypeRegistry as any,
      alertTypeRegistry: {} as any,
    };
    actionTypeRegistry.has.mockReturnValue(true);

    wrapper = mountWithIntl(
      <AppContextProvider appDeps={deps}>
        <ActionsConnectorsList />
      </AppContextProvider>
    );

    // Wait for active space to resolve before requesting the component to update
    await act(async () => {
      await nextTick();
      wrapper.update();
    });
  }

  it('renders empty prompt', async () => {
    await setup();
    expect(wrapper.find('EuiEmptyPrompt')).toHaveLength(1);
    expect(
      wrapper.find('[data-test-subj="createFirstActionButton"]').find('EuiButton')
    ).toHaveLength(1);
  });

  test('if click create button should render ConnectorAddFlyout', async () => {
    await setup();
    wrapper.find('[data-test-subj="createFirstActionButton"]').first().simulate('click');
    expect(wrapper.find('ConnectorAddFlyout')).toHaveLength(1);
  });
});

describe('actions_connectors_list component with items', () => {
  let wrapper: ReactWrapper<any>;

  async function setup() {
    const { loadAllActions, loadActionTypes } = jest.requireMock(
      '../../../lib/action_connector_api'
    );
    loadAllActions.mockResolvedValueOnce([
      {
        id: '1',
        actionTypeId: 'test',
        description: 'My test',
        isPreconfigured: false,
        referencedByCount: 1,
        config: {},
      },
      {
        id: '2',
        actionTypeId: 'test2',
        description: 'My test 2',
        referencedByCount: 1,
        isPreconfigured: false,
        config: {},
      },
      {
        id: '3',
        actionTypeId: 'test2',
        description: 'My preconfigured test 2',
        referencedByCount: 1,
        isPreconfigured: true,
        config: {},
      },
    ]);
    loadActionTypes.mockResolvedValueOnce([
      {
        id: 'test',
        name: 'Test',
        enabled: true,
      },
      {
        id: 'test2',
        name: 'Test2',
        enabled: true,
      },
    ]);

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
          'actions:show': true,
          'actions:save': true,
          'actions:delete': true,
        },
      },
      history: scopedHistoryMock.create(),
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
        <ActionsConnectorsList />
      </AppContextProvider>
    );

    // Wait for active space to resolve before requesting the component to update
    await act(async () => {
      await nextTick();
      wrapper.update();
    });

    expect(loadAllActions).toHaveBeenCalled();
  }

  it('renders table of connectors', async () => {
    await setup();
    expect(wrapper.find('EuiInMemoryTable')).toHaveLength(1);
    expect(wrapper.find('EuiTableRow')).toHaveLength(3);
  });

  it('renders table with preconfigured connectors', async () => {
    await setup();
    expect(wrapper.find('[data-test-subj="preConfiguredTitleMessage"]')).toHaveLength(2);
  });

  test('if select item for edit should render ConnectorEditFlyout', async () => {
    await setup();
    await wrapper.find('[data-test-subj="edit1"]').first().simulate('click');

    expect(wrapper.find('ConnectorEditFlyout')).toHaveLength(1);
  });
});

describe('actions_connectors_list component empty with show only capability', () => {
  let wrapper: ReactWrapper<any>;

  async function setup() {
    const { loadAllActions, loadActionTypes } = jest.requireMock(
      '../../../lib/action_connector_api'
    );
    loadAllActions.mockResolvedValueOnce([]);
    loadActionTypes.mockResolvedValueOnce([
      {
        id: 'test',
        name: 'Test',
      },
      {
        id: 'test2',
        name: 'Test2',
      },
    ]);
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
          'actions:show': true,
          'actions:save': false,
          'actions:delete': false,
        },
      },
      history: scopedHistoryMock.create(),
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
        <ActionsConnectorsList />
      </AppContextProvider>
    );

    // Wait for active space to resolve before requesting the component to update
    await act(async () => {
      await nextTick();
      wrapper.update();
    });
  }

  it('renders no permissions to create connector', async () => {
    await setup();
    expect(wrapper.find('[defaultMessage="No permissions to create connector"]')).toHaveLength(1);
    expect(wrapper.find('[data-test-subj="createActionButton"]')).toHaveLength(0);
  });
});

describe('actions_connectors_list with show only capability', () => {
  let wrapper: ReactWrapper<any>;

  async function setup() {
    const { loadAllActions, loadActionTypes } = jest.requireMock(
      '../../../lib/action_connector_api'
    );
    loadAllActions.mockResolvedValueOnce([
      {
        id: '1',
        actionTypeId: 'test',
        description: 'My test',
        referencedByCount: 1,
        config: {},
      },
      {
        id: '2',
        actionTypeId: 'test2',
        description: 'My test 2',
        referencedByCount: 1,
        config: {},
      },
    ]);
    loadActionTypes.mockResolvedValueOnce([
      {
        id: 'test',
        name: 'Test',
      },
      {
        id: 'test2',
        name: 'Test2',
      },
    ]);
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
          'actions:show': true,
          'actions:save': false,
          'actions:delete': false,
        },
      },
      history: scopedHistoryMock.create(),
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
        <ActionsConnectorsList />
      </AppContextProvider>
    );

    // Wait for active space to resolve before requesting the component to update
    await act(async () => {
      await nextTick();
      wrapper.update();
    });
  }

  it('renders table of connectors with delete button disabled', async () => {
    await setup();
    expect(wrapper.find('EuiInMemoryTable')).toHaveLength(1);
    expect(wrapper.find('EuiTableRow')).toHaveLength(2);
    wrapper.find('EuiTableRow').forEach((elem) => {
      const deleteButton = elem.find('[data-test-subj="deleteConnector"]').first();
      expect(deleteButton).toBeTruthy();
      expect(deleteButton.prop('isDisabled')).toBeTruthy();
    });
  });
});

describe('actions_connectors_list component with disabled items', () => {
  let wrapper: ReactWrapper<any>;

  async function setup() {
    const { loadAllActions, loadActionTypes } = jest.requireMock(
      '../../../lib/action_connector_api'
    );
    loadAllActions.mockResolvedValueOnce([
      {
        id: '1',
        actionTypeId: 'test',
        description: 'My test',
        referencedByCount: 1,
        config: {},
      },
      {
        id: '2',
        actionTypeId: 'test2',
        description: 'My test 2',
        referencedByCount: 1,
        config: {},
      },
    ]);
    loadActionTypes.mockResolvedValueOnce([
      {
        id: 'test',
        name: 'Test',
        enabled: false,
        enabledInConfig: false,
        enabledInLicense: true,
      },
      {
        id: 'test2',
        name: 'Test2',
        enabled: false,
        enabledInConfig: true,
        enabledInLicense: false,
      },
    ]);

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
      toastNotifications: mockes.notifications.toasts,
      injectedMetadata: mockes.injectedMetadata,
      http: mockes.http,
      uiSettings: mockes.uiSettings,
      navigateToApp,
      capabilities: {
        ...capabilities,
        securitySolution: {
          'actions:show': true,
          'actions:save': true,
          'actions:delete': true,
        },
      },
      history: scopedHistoryMock.create(),
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
        <ActionsConnectorsList />
      </AppContextProvider>
    );

    // Wait for active space to resolve before requesting the component to update
    await act(async () => {
      await nextTick();
      wrapper.update();
    });

    expect(loadAllActions).toHaveBeenCalled();
  }

  it('renders table of connectors', async () => {
    await setup();
    expect(wrapper.find('EuiInMemoryTable')).toHaveLength(1);
    expect(wrapper.find('EuiTableRow')).toHaveLength(2);
    expect(wrapper.find('EuiTableRow').at(0).prop('className')).toEqual(
      'actConnectorsList__tableRowDisabled'
    );
    expect(wrapper.find('EuiTableRow').at(1).prop('className')).toEqual(
      'actConnectorsList__tableRowDisabled'
    );
  });
});
