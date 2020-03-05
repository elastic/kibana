/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import * as React from 'react';
import { mountWithIntl } from 'test_utils/enzyme_helpers';
import { coreMock } from '../../../../../../../src/core/public/mocks';
import { ConnectorAddModal } from './connector_add_modal';
import { ActionsConnectorsContextProvider } from '../../context/actions_connectors_context';
import { actionTypeRegistryMock } from '../../action_type_registry.mock';
import { ValidationResult } from '../../../types';
import { AppDeps } from '../../app';
import { dataPluginMock } from '../../../../../../../src/plugins/data/public/mocks';
import { chartPluginMock } from '../../../../../../../src/plugins/charts/public/mocks';
const actionTypeRegistry = actionTypeRegistryMock.create();

describe('connector_add_modal', () => {
  let deps: AppDeps | null;

  beforeAll(async () => {
    const mocks = coreMock.createSetup();
    const [
      {
        chrome,
        docLinks,
        application: { capabilities },
      },
    ] = await mocks.getStartServices();
    deps = {
      chrome,
      docLinks,
      dataPlugin: dataPluginMock.createStartContract(),
      charts: chartPluginMock.createStartContract(),
      toastNotifications: mocks.notifications.toasts,
      injectedMetadata: mocks.injectedMetadata,
      http: mocks.http,
      uiSettings: mocks.uiSettings,
      capabilities: {
        ...capabilities,
        actions: {
          delete: true,
          save: true,
          show: true,
        },
      },
      setBreadcrumbs: jest.fn(),
      actionTypeRegistry: actionTypeRegistry as any,
      alertTypeRegistry: {} as any,
    };
  });
  it('renders connector modal form if addModalVisible is true', () => {
    const actionTypeModel = {
      id: 'my-action-type',
      iconClass: 'test',
      selectMessage: 'test',
      validateConnector: (): ValidationResult => {
        return { errors: {} };
      },
      validateParams: (): ValidationResult => {
        const validationResult = { errors: {} };
        return validationResult;
      },
      actionConnectorFields: null,
      actionParamsFields: null,
    };
    actionTypeRegistry.get.mockReturnValueOnce(actionTypeModel);
    actionTypeRegistry.has.mockReturnValue(true);

    const actionType = {
      id: 'my-action-type',
      name: 'test',
      enabled: true,
    };

    const wrapper = deps
      ? mountWithIntl(
          <ActionsConnectorsContextProvider
            value={{
              addFlyoutVisible: true,
              setAddFlyoutVisibility: state => {},
              editFlyoutVisible: false,
              setEditFlyoutVisibility: state => {},
              actionTypesIndex: {
                'my-action-type': { id: 'my-action-type', name: 'test', enabled: true },
              },
              reloadConnectors: () => {
                return new Promise<void>(() => {});
              },
            }}
          >
            <ConnectorAddModal
              addModalVisible={true}
              setAddModalVisibility={() => {}}
              actionType={actionType}
              http={deps.http}
              actionTypeRegistry={deps.actionTypeRegistry}
              alertTypeRegistry={deps.alertTypeRegistry}
              toastNotifications={deps.toastNotifications}
            />
          </ActionsConnectorsContextProvider>
        )
      : undefined;
    expect(wrapper?.find('EuiModalHeader')).toHaveLength(1);
    expect(wrapper?.find('[data-test-subj="saveActionButtonModal"]').exists()).toBeTruthy();
  });
});
