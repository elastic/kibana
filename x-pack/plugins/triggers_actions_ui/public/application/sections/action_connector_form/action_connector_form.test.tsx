/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import * as React from 'react';
import { mountWithIntl } from '@kbn/test/jest';
import { actionTypeRegistryMock } from '../../action_type_registry.mock';
import { ValidationResult, UserConfiguredActionConnector } from '../../../types';
import { ActionConnectorForm } from './action_connector_form';
const actionTypeRegistry = actionTypeRegistryMock.create();
jest.mock('../../../../common/lib/kibana');

describe('action_connector_form', () => {
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

    const initialConnector: UserConfiguredActionConnector<{}, {}> = {
      id: '123',
      name: '',
      actionTypeId: actionType.id,
      config: {},
      secrets: {},
      isPreconfigured: false,
    };
    const wrapper = mountWithIntl(
      <ActionConnectorForm
        actionTypeName={'my-action-type-name'}
        connector={initialConnector}
        dispatch={() => {}}
        errors={{ name: [] }}
        actionTypeRegistry={actionTypeRegistry}
      />
    );
    const connectorNameField = wrapper?.find('[data-test-subj="nameInput"]');
    expect(connectorNameField?.exists()).toBeTruthy();
    expect(connectorNameField?.first().prop('value')).toBe('');
  });
});
