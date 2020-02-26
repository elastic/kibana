/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import * as React from 'react';
import { mountWithIntl } from 'test_utils/enzyme_helpers';
import { coreMock } from '../../../../../../../src/core/public/mocks';
import { ActionsConnectorsContextProvider } from '../../context/actions_connectors_context';
import { actionTypeRegistryMock } from '../../action_type_registry.mock';
import { ActionTypeMenu } from './action_type_menu';
import { ValidationResult } from '../../../types';
const actionTypeRegistry = actionTypeRegistryMock.create();

describe('connector_add_flyout', () => {
  let deps: any;

  beforeAll(async () => {
    const mockes = coreMock.createSetup();
    const [
      {
        chrome,
        docLinks,
        application: { capabilities },
      },
    ] = await mockes.getStartServices();
    deps = {
      chrome,
      docLinks,
      toastNotifications: mockes.notifications.toasts,
      injectedMetadata: mockes.injectedMetadata,
      http: mockes.http,
      uiSettings: mockes.uiSettings,
      capabilities: {
        ...capabilities,
        actions: {
          delete: true,
          save: true,
          show: true,
        },
      },
      legacy: {
        MANAGEMENT_BREADCRUMB: { set: () => {} } as any,
      },
      actionTypeRegistry: actionTypeRegistry as any,
      alertTypeRegistry: {} as any,
    };
  });

  it('renders action type menu with proper EuiCards for registered action types', () => {
    const onActionTypeChange = jest.fn();
    const actionType = {
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
    actionTypeRegistry.get.mockReturnValueOnce(actionType);

    const wrapper = mountWithIntl(
      <ActionsConnectorsContextProvider
        value={{
          addFlyoutVisible: true,
          setAddFlyoutVisibility: state => {},
          editFlyoutVisible: false,
          setEditFlyoutVisibility: state => {},
          actionTypesIndex: {
            'first-action-type': { id: 'first-action-type', name: 'first', enabled: true },
            'second-action-type': { id: 'second-action-type', name: 'second', enabled: true },
          },
          reloadConnectors: () => {
            return new Promise<void>(() => {});
          },
        }}
      >
        <ActionTypeMenu
          onActionTypeChange={onActionTypeChange}
          actionTypeRegistry={deps.actionTypeRegistry}
        />
      </ActionsConnectorsContextProvider>
    );

    expect(wrapper.find('[data-test-subj="first-action-type-card"]').exists()).toBeTruthy();
    expect(wrapper.find('[data-test-subj="second-action-type-card"]').exists()).toBeTruthy();
  });
});
