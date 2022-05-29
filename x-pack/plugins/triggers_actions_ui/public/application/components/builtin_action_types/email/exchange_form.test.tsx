/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import ExchangeFormFields from './exchange_form';
import { ConnectorFormTestProvider } from '../test_utils';

jest.mock('../../../../common/lib/kibana');

describe('ExchangeFormFields renders', () => {
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
      hasAuth: true,
      service: 'other',
    },
    isDeprecated: false,
  };

  test('should display exchange form fields', () => {
    const wrapper = mountWithIntl(
      <ConnectorFormTestProvider connector={actionConnector}>
        <ExchangeFormFields readOnly={false} />
      </ConnectorFormTestProvider>
    );
    expect(wrapper.find('[data-test-subj="emailClientSecret"]').length > 0).toBeTruthy();
    expect(wrapper.find('[data-test-subj="emailClientId"]').length > 0).toBeTruthy();
    expect(wrapper.find('[data-test-subj="emailTenantId"]').length > 0).toBeTruthy();
  });

  test('exchange field defaults to empty when not defined', () => {
    const wrapper = mountWithIntl(
      <ConnectorFormTestProvider connector={actionConnector}>
        <ExchangeFormFields readOnly={false} />
      </ConnectorFormTestProvider>
    );
    expect(wrapper.find('[data-test-subj="emailClientSecret"]').length > 0).toBeTruthy();
    expect(wrapper.find('input[data-test-subj="emailClientSecret"]').prop('value')).toEqual('');

    expect(wrapper.find('[data-test-subj="emailClientId"]').length > 0).toBeTruthy();
    expect(wrapper.find('input[data-test-subj="emailClientId"]').prop('value')).toEqual('');

    expect(wrapper.find('[data-test-subj="emailTenantId"]').length > 0).toBeTruthy();
    expect(wrapper.find('input[data-test-subj="emailTenantId"]').prop('value')).toEqual('');
  });
});
