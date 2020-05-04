/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { mountWithIntl } from 'test_utils/enzyme_helpers';
import { TypeRegistry } from '../../../type_registry';
import { registerBuiltInActionTypes } from '../index';
import { ActionTypeModel } from '../../../../types';
import { EmailActionConnector } from '../types';

const ACTION_TYPE_ID = '.email';
let actionTypeModel: ActionTypeModel;

beforeAll(() => {
  const actionTypeRegistry = new TypeRegistry<ActionTypeModel>();
  registerBuiltInActionTypes({ actionTypeRegistry });
  const getResult = actionTypeRegistry.get(ACTION_TYPE_ID);
  if (getResult !== null) {
    actionTypeModel = getResult;
  }
});

describe('EmailActionConnectorFields renders', () => {
  test('all connector fields is rendered', () => {
    expect(actionTypeModel.actionConnectorFields).not.toBeNull();
    if (!actionTypeModel.actionConnectorFields) {
      return;
    }
    const ConnectorFields = actionTypeModel.actionConnectorFields;
    const actionConnector = {
      secrets: {
        user: 'user',
        password: 'pass',
      },
      id: 'test',
      actionTypeId: '.email',
      name: 'email',
      config: {
        from: 'test@test.com',
      },
    } as EmailActionConnector;
    const wrapper = mountWithIntl(
      <ConnectorFields
        action={actionConnector}
        errors={{ from: [], port: [], host: [], user: [], password: [] }}
        editActionConfig={() => {}}
        editActionSecrets={() => {}}
      />
    );
    expect(wrapper.find('[data-test-subj="emailFromInput"]').length > 0).toBeTruthy();
    expect(
      wrapper
        .find('[data-test-subj="emailFromInput"]')
        .first()
        .prop('value')
    ).toBe('test@test.com');
    expect(wrapper.find('[data-test-subj="emailHostInput"]').length > 0).toBeTruthy();
    expect(wrapper.find('[data-test-subj="emailPortInput"]').length > 0).toBeTruthy();
    expect(wrapper.find('[data-test-subj="emailUserInput"]').length > 0).toBeTruthy();
    expect(wrapper.find('[data-test-subj="emailPasswordInput"]').length > 0).toBeTruthy();
  });
});
