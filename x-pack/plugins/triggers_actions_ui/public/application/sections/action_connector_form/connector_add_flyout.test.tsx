/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import * as React from 'react';
import { mountWithIntl } from 'test_utils/enzyme_helpers';
import { coreMock } from '../../../../../../../src/core/public/mocks';
import ConnectorAddFlyout from './connector_add_flyout';
import { ActionsConnectorsContextProvider } from '../../context/actions_connectors_context';
import { actionTypeRegistryMock } from '../../action_type_registry.mock';
import { ValidationResult } from '../../../types';

const actionTypeRegistry = actionTypeRegistryMock.create();

describe('connector_add_flyout', () => {
  let deps: any;

  beforeAll(async () => {
    const mocks = coreMock.createSetup();
    const [
      {
        application: { capabilities },
      },
    ] = await mocks.getStartServices();
    deps = {
      toastNotifications: mocks.notifications.toasts,
      http: mocks.http,
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

  it('renders action type menu on flyout open', () => {
    const actionType = createActionType();
    actionTypeRegistry.get.mockReturnValueOnce(actionType);
    actionTypeRegistry.has.mockReturnValue(true);

    const wrapper = mountWithIntl(
      <ActionsConnectorsContextProvider
        value={{
          http: deps!.http,
          toastNotifications: deps!.toastNotifications,
          actionTypeRegistry: deps!.actionTypeRegistry,
          capabilities: deps!.capabilities,
          reloadConnectors: () => {
            return new Promise<void>(() => {});
          },
          docLinks: deps!.docLinks,
        }}
      >
        <ConnectorAddFlyout
          addFlyoutVisible={true}
          setAddFlyoutVisibility={() => {}}
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
    expect(wrapper.find('ActionTypeMenu')).toHaveLength(1);
    expect(wrapper.find(`[data-test-subj="${actionType.id}-card"]`).exists()).toBeTruthy();
  });

  it('renders banner with subscription links when gold features are disabled due to licensing ', () => {
    const actionType = createActionType();
    const disabledActionType = createActionType();

    actionTypeRegistry.get.mockReturnValueOnce(actionType);
    actionTypeRegistry.has.mockReturnValue(true);

    const wrapper = mountWithIntl(
      <ActionsConnectorsContextProvider
        value={{
          http: deps!.http,
          toastNotifications: deps!.toastNotifications,
          actionTypeRegistry: deps!.actionTypeRegistry,
          capabilities: deps!.capabilities,
          reloadConnectors: () => {
            return new Promise<void>(() => {});
          },
          docLinks: deps!.docLinks,
        }}
      >
        <ConnectorAddFlyout
          addFlyoutVisible={true}
          setAddFlyoutVisibility={() => {}}
          actionTypes={[
            {
              id: actionType.id,
              enabled: true,
              name: 'Test',
              enabledInConfig: true,
              enabledInLicense: true,
              minimumLicenseRequired: 'basic',
            },
            {
              id: disabledActionType.id,
              enabled: true,
              name: 'Test',
              enabledInConfig: true,
              enabledInLicense: false,
              minimumLicenseRequired: 'gold',
            },
          ]}
        />
      </ActionsConnectorsContextProvider>
    );
    const callout = wrapper.find('UpgradeYourLicenseCallOut');
    expect(callout).toHaveLength(1);

    const manageLink = callout.find('EuiButton');
    expect(manageLink).toHaveLength(1);
    expect(manageLink.getElements()[0].props.href).toMatchInlineSnapshot(
      `"/app/management/stack/license_management"`
    );

    const subscriptionLink = callout.find('EuiButtonEmpty');
    expect(subscriptionLink).toHaveLength(1);
    expect(subscriptionLink.getElements()[0].props.href).toMatchInlineSnapshot(
      `"https://www.elastic.co/subscriptions"`
    );
  });

  it('does not render banner with subscription links when only platinum features are disabled due to licensing ', () => {
    const actionType = createActionType();
    const disabledActionType = createActionType();

    actionTypeRegistry.get.mockReturnValueOnce(actionType);
    actionTypeRegistry.has.mockReturnValue(true);

    const wrapper = mountWithIntl(
      <ActionsConnectorsContextProvider
        value={{
          http: deps!.http,
          toastNotifications: deps!.toastNotifications,
          actionTypeRegistry: deps!.actionTypeRegistry,
          capabilities: deps!.capabilities,
          reloadConnectors: () => {
            return new Promise<void>(() => {});
          },
          docLinks: deps!.docLinks,
        }}
      >
        <ConnectorAddFlyout
          addFlyoutVisible={true}
          setAddFlyoutVisibility={() => {}}
          actionTypes={[
            {
              id: actionType.id,
              enabled: true,
              name: 'Test',
              enabledInConfig: true,
              enabledInLicense: true,
              minimumLicenseRequired: 'basic',
            },
            {
              id: disabledActionType.id,
              enabled: true,
              name: 'Test',
              enabledInConfig: true,
              enabledInLicense: false,
              minimumLicenseRequired: 'platinum',
            },
          ]}
        />
      </ActionsConnectorsContextProvider>
    );
    const callout = wrapper.find('UpgradeYourLicenseCallOut');
    expect(callout).toHaveLength(0);
  });

  it('does not render banner with subscription links when only enterprise features are disabled due to licensing ', () => {
    const actionType = createActionType();
    const disabledActionType = createActionType();

    actionTypeRegistry.get.mockReturnValueOnce(actionType);
    actionTypeRegistry.has.mockReturnValue(true);

    const wrapper = mountWithIntl(
      <ActionsConnectorsContextProvider
        value={{
          http: deps!.http,
          toastNotifications: deps!.toastNotifications,
          actionTypeRegistry: deps!.actionTypeRegistry,
          capabilities: deps!.capabilities,
          reloadConnectors: () => {
            return new Promise<void>(() => {});
          },
          docLinks: deps!.docLinks,
        }}
      >
        <ConnectorAddFlyout
          addFlyoutVisible={true}
          setAddFlyoutVisibility={() => {}}
          actionTypes={[
            {
              id: actionType.id,
              enabled: true,
              name: 'Test',
              enabledInConfig: true,
              enabledInLicense: true,
              minimumLicenseRequired: 'basic',
            },
            {
              id: disabledActionType.id,
              enabled: true,
              name: 'Test',
              enabledInConfig: true,
              enabledInLicense: false,
              minimumLicenseRequired: 'enterprise',
            },
          ]}
        />
      </ActionsConnectorsContextProvider>
    );
    const callout = wrapper.find('UpgradeYourLicenseCallOut');
    expect(callout).toHaveLength(0);
  });
});

let count = 0;
function createActionType() {
  return {
    id: `my-action-type-${++count}`,
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
}
