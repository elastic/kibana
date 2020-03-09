/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import * as React from 'react';
import { mountWithIntl } from 'test_utils/enzyme_helpers';
import { coreMock } from '../../../../../../../src/core/public/mocks';
import { ConnectorAddFlyout } from './connector_add_flyout';
import {
  ActionsConnectorsContextProvider,
  ActionsConnectorsContextValue,
} from '../../context/actions_connectors_context';
import { actionTypeRegistryMock } from '../../action_type_registry.mock';
import { ValidationResult } from '../../../types';

const actionTypeRegistry = actionTypeRegistryMock.create();

describe('connector_add_flyout', () => {
  let deps: ActionsConnectorsContextValue;

  beforeAll(async () => {
    const mocks = coreMock.createSetup();
    const [
      {
        chrome,
        docLinks,
        application: { capabilities, navigateToApp },
      },
    ] = await mocks.getStartServices();
    deps = {
      toastNotifications: mocks.notifications.toasts,
      http: mocks.http,
      navigateToApp,
      capabilities: {
        ...capabilities,
        actions: {
          delete: true,
          save: true,
          show: true,
        },
      },
      actionTypeRegistry: actionTypeRegistry as any,
    };
  });

  it('renders action type menu on flyout open', () => {
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
            },
          ]}
        />
      </ActionsConnectorsContextProvider>
    );
    expect(wrapper.find('ActionTypeMenu')).toHaveLength(1);
    expect(wrapper.find('[data-test-subj="my-action-type-card"]').exists()).toBeTruthy();
  });
});
