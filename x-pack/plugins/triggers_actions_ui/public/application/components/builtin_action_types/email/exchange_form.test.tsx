/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import { EmailActionConnector } from '../types';
import ExchangeFormFields from './exchange_form';

jest.mock('../../../../common/lib/kibana');

describe('ExchangeFormFields renders', () => {
  test('should display exchange form fields', () => {
    const actionConnector = {
      secrets: {
        clientSecret: 'user',
      },
      id: 'test',
      actionTypeId: '.email',
      name: 'exchange email',
      config: {
        from: 'test@test.com',
        hasAuth: true,
        service: 'exchange_server',
        clientId: '123',
        tenantId: '1234',
      },
    } as EmailActionConnector;
    const wrapper = mountWithIntl(
      <ExchangeFormFields
        action={actionConnector}
        errors={{ from: [], port: [], host: [], user: [], password: [], service: [] }}
        editActionConfig={() => {}}
        editActionSecrets={() => {}}
        readOnly={false}
      />
    );
    expect(wrapper.find('[data-test-subj="emailClientSecret"]').length > 0).toBeTruthy();
    expect(wrapper.find('[data-test-subj="emailClientId"]').length > 0).toBeTruthy();
    expect(wrapper.find('[data-test-subj="emailTenantId"]').length > 0).toBeTruthy();
  });

  test('exchange field defaults to empty when not defined', () => {
    const actionConnector = {
      secrets: {},
      id: 'test',
      actionTypeId: '.email',
      name: 'email',
      config: {
        from: 'test@test.com',
        hasAuth: true,
        service: 'exchange_server',
      },
    } as EmailActionConnector;
    const wrapper = mountWithIntl(
      <ExchangeFormFields
        action={actionConnector}
        errors={{ from: [], port: [], host: [], user: [], password: [], service: [] }}
        editActionConfig={() => {}}
        editActionSecrets={() => {}}
        readOnly={false}
      />
    );
    expect(wrapper.find('[data-test-subj="emailClientSecret"]').length > 0).toBeTruthy();
    expect(wrapper.find('input[data-test-subj="emailClientSecret"]').prop('value')).toEqual('');

    expect(wrapper.find('[data-test-subj="emailClientId"]').length > 0).toBeTruthy();
    expect(wrapper.find('input[data-test-subj="emailClientId"]').prop('value')).toEqual('');

    expect(wrapper.find('[data-test-subj="emailTenantId"]').length > 0).toBeTruthy();
    expect(wrapper.find('input[data-test-subj="emailTenantId"]').prop('value')).toEqual('');
  });
});
