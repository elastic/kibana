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
        application: { capabilities },
      },
    ] = await mockes.getStartServices();
    deps = {
      http: mockes.http,
      toastNotifications: mockes.notifications.toasts,
      capabilities: {
        ...capabilities,
        actions: {
          delete: true,
          save: true,
          show: true,
        },
      },
      actionTypeRegistry: actionTypeRegistry as any,
      docLinks: { ELASTIC_WEBSITE_URL: '', DOC_LINK_VERSION: '' },
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
          http: deps!.http,
          actionTypeRegistry: deps!.actionTypeRegistry,
          capabilities: deps!.capabilities,
          toastNotifications: deps!.toastNotifications,
          reloadConnectors: () => {
            return new Promise<void>(() => {});
          },
          docLinks: deps!.docLinks,
        }}
      >
        <ActionTypeMenu
          onActionTypeChange={onActionTypeChange}
          actionTypes={[
            {
              id: actionType.id,
              enabled: true,
              name: 'Test',
              enabledInConfig: true,
              enabledInLicense: true,
              minimumLicenseRequired: 'basic',
            },
          ]}
        />
      </ActionsConnectorsContextProvider>
    );

    expect(wrapper.find('[data-test-subj="my-action-type-card"]').exists()).toBeTruthy();
  });

  it(`doesn't renders action types that are disabled via config`, () => {
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
          http: deps!.http,
          actionTypeRegistry: deps!.actionTypeRegistry,
          capabilities: deps!.capabilities,
          toastNotifications: deps!.toastNotifications,
          reloadConnectors: () => {
            return new Promise<void>(() => {});
          },
          docLinks: deps!.docLinks,
        }}
      >
        <ActionTypeMenu
          onActionTypeChange={onActionTypeChange}
          actionTypes={[
            {
              id: actionType.id,
              enabled: false,
              name: 'Test',
              enabledInConfig: false,
              enabledInLicense: true,
              minimumLicenseRequired: 'gold',
            },
          ]}
        />
      </ActionsConnectorsContextProvider>
    );

    expect(wrapper.find('[data-test-subj="my-action-type-card"]').exists()).toBeFalsy();
  });

  it(`renders action types as disabled when disabled by license`, () => {
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
          http: deps!.http,
          actionTypeRegistry: deps!.actionTypeRegistry,
          capabilities: deps!.capabilities,
          toastNotifications: deps!.toastNotifications,
          reloadConnectors: () => {
            return new Promise<void>(() => {});
          },
          docLinks: deps!.docLinks,
        }}
      >
        <ActionTypeMenu
          onActionTypeChange={onActionTypeChange}
          actionTypes={[
            {
              id: actionType.id,
              enabled: false,
              name: 'Test',
              enabledInConfig: true,
              enabledInLicense: false,
              minimumLicenseRequired: 'gold',
            },
          ]}
        />
      </ActionsConnectorsContextProvider>
    );

    expect(wrapper.find('EuiToolTip [data-test-subj="my-action-type-card"]').exists()).toBeTruthy();
  });
});
