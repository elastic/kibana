/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import * as React from 'react';
import { mountWithIntl } from 'test_utils/enzyme_helpers';
import { coreMock } from '../../../../../../../src/core/public/mocks';
import { actionTypeRegistryMock } from '../../action_type_registry.mock';
import { ValidationResult, ActionConnector } from '../../../types';
import { ActionConnectorForm } from './action_connector_form';
const actionTypeRegistry = actionTypeRegistryMock.create();

describe('action_connector_form', () => {
  let deps: any;
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
      legacy: {
        MANAGEMENT_BREADCRUMB: { set: () => {} } as any,
      },
      actionTypeRegistry: actionTypeRegistry as any,
      alertTypeRegistry: {} as any,
    };
  });

  it('renders action_connector_form', () => {
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
    actionTypeRegistry.get.mockReturnValue(actionType);
    actionTypeRegistry.has.mockReturnValue(true);

    const initialConnector = {
      actionTypeId: actionType.id,
      config: {},
      secrets: {},
    } as ActionConnector;
    let wrapper;
    if (deps) {
      wrapper = mountWithIntl(
        <ActionConnectorForm
          actionTypeName={'my-action-type-name'}
          connector={initialConnector}
          dispatch={() => {}}
          serverError={null}
          errors={{ name: [] }}
          actionTypeRegistry={deps.actionTypeRegistry}
        />
      );
    }
    const connectorNameField = wrapper?.find('[data-test-subj="nameInput"]');
    expect(connectorNameField?.exists()).toBeTruthy();
    expect(connectorNameField?.first().prop('value')).toBe('');
  });
});
