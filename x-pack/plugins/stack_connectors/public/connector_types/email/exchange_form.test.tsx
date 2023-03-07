/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import ExchangeFormFields from './exchange_form';
import { ConnectorFormTestProvider } from '../lib/test_utils';
import { act, render, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

jest.mock('@kbn/triggers-actions-ui-plugin/public/common/lib/kibana');

describe('ExchangeFormFields renders', () => {
  const actionConnector = {
    secrets: {
      clientSecret: 'secret',
    },
    id: 'test',
    actionTypeId: '.email',
    name: 'email',
    isDeprecated: false,
    config: {
      from: 'test@test.com',
      service: 'exchange_server',
      tenantId: 'tenant-id',
      clientId: 'clientId-id',
    },
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
    const connector = {
      ...actionConnector,
      secrets: {},
      config: {
        from: 'test@test.com',
      },
    };

    const wrapper = mountWithIntl(
      <ConnectorFormTestProvider connector={connector}>
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

  describe('Validation', () => {
    const onSubmit = jest.fn();

    beforeEach(() => {
      jest.clearAllMocks();
    });

    const tests: Array<[string, string]> = [
      ['emailTenantId', ''],
      ['emailClientId', ''],
      ['emailClientSecret', ''],
    ];

    it('connector validation succeeds when connector config is valid', async () => {
      const { getByTestId } = render(
        <ConnectorFormTestProvider connector={actionConnector} onSubmit={onSubmit}>
          <ExchangeFormFields readOnly={false} />
        </ConnectorFormTestProvider>
      );

      await act(async () => {
        userEvent.click(getByTestId('form-test-provide-submit'));
      });

      await waitFor(() => {
        expect(onSubmit).toBeCalledWith({
          data: {
            secrets: {
              clientSecret: 'secret',
            },
            id: 'test',
            actionTypeId: '.email',
            name: 'email',
            isDeprecated: false,
            config: {
              tenantId: 'tenant-id',
              clientId: 'clientId-id',
            },
          },
          isValid: true,
        });
      });
    });

    it.each(tests)('validates correctly %p', async (field, value) => {
      const res = render(
        <ConnectorFormTestProvider connector={actionConnector} onSubmit={onSubmit}>
          <ExchangeFormFields readOnly={false} />
        </ConnectorFormTestProvider>
      );

      await act(async () => {
        await userEvent.type(res.getByTestId(field), `{selectall}{backspace}${value}`, {
          delay: 10,
        });
      });

      await act(async () => {
        userEvent.click(res.getByTestId('form-test-provide-submit'));
      });

      expect(onSubmit).toHaveBeenCalledWith({ data: {}, isValid: false });
    });
  });
});
