/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import WebhookActionConnectorFields from './webhook_connectors';
import { ConnectorFormTestProvider, waitForComponentToUpdate } from '../lib/test_utils';
import { act, render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

describe('WebhookActionConnectorFields renders', () => {
  test('all connector fields is rendered', async () => {
    const actionConnector = {
      actionTypeId: '.webhook',
      name: 'webhook',
      config: {
        method: 'PUT',
        url: 'https://test.com',
        headers: [{ key: 'content-type', value: 'text' }],
        hasAuth: true,
      },
      secrets: {
        user: 'user',
        password: 'pass',
      },
      isDeprecated: false,
    };

    const wrapper = mountWithIntl(
      <ConnectorFormTestProvider connector={actionConnector}>
        <WebhookActionConnectorFields
          readOnly={false}
          isEdit={false}
          registerPreSubmitValidator={() => {}}
        />
      </ConnectorFormTestProvider>
    );

    await waitForComponentToUpdate();

    expect(wrapper.find('[data-test-subj="webhookViewHeadersSwitch"]').length > 0).toBeTruthy();
    wrapper.find('[data-test-subj="webhookViewHeadersSwitch"]').first().simulate('click');
    expect(wrapper.find('[data-test-subj="webhookMethodSelect"]').length > 0).toBeTruthy();
    expect(wrapper.find('[data-test-subj="webhookUrlText"]').length > 0).toBeTruthy();
    expect(wrapper.find('[data-test-subj="webhookUserInput"]').length > 0).toBeTruthy();
    expect(wrapper.find('[data-test-subj="webhookPasswordInput"]').length > 0).toBeTruthy();
  });

  describe('Validation', () => {
    const onSubmit = jest.fn();
    const actionConnector = {
      actionTypeId: '.webhook',
      name: 'webhook',
      config: {
        method: 'PUT',
        url: 'https://test.com',
        headers: [{ key: 'content-type', value: 'text' }],
        hasAuth: true,
      },
      secrets: {
        user: 'user',
        password: 'pass',
      },
      isDeprecated: false,
    };

    beforeEach(() => {
      jest.clearAllMocks();
    });

    const tests: Array<[string, string]> = [
      ['webhookUrlText', 'not-valid'],
      ['webhookUserInput', ''],
      ['webhookPasswordInput', ''],
    ];

    it('connector validation succeeds when connector config is valid', async () => {
      const { getByTestId } = render(
        <ConnectorFormTestProvider connector={actionConnector} onSubmit={onSubmit}>
          <WebhookActionConnectorFields
            readOnly={false}
            isEdit={false}
            registerPreSubmitValidator={() => {}}
          />
        </ConnectorFormTestProvider>
      );

      await act(async () => {
        userEvent.click(getByTestId('form-test-provide-submit'));
      });

      expect(onSubmit).toBeCalledWith({
        data: {
          actionTypeId: '.webhook',
          name: 'webhook',
          config: {
            method: 'PUT',
            url: 'https://test.com',
            headers: [{ key: 'content-type', value: 'text' }],
            hasAuth: true,
          },
          secrets: {
            user: 'user',
            password: 'pass',
          },
          __internal__: {
            hasHeaders: true,
          },
          isDeprecated: false,
        },
        isValid: true,
      });
    });

    it('connector validation succeeds when auth=false', async () => {
      const connector = {
        ...actionConnector,
        config: {
          ...actionConnector.config,
          hasAuth: false,
        },
      };

      const { getByTestId } = render(
        <ConnectorFormTestProvider connector={connector} onSubmit={onSubmit}>
          <WebhookActionConnectorFields
            readOnly={false}
            isEdit={false}
            registerPreSubmitValidator={() => {}}
          />
        </ConnectorFormTestProvider>
      );

      await act(async () => {
        userEvent.click(getByTestId('form-test-provide-submit'));
      });

      expect(onSubmit).toBeCalledWith({
        data: {
          actionTypeId: '.webhook',
          name: 'webhook',
          config: {
            method: 'PUT',
            url: 'https://test.com',
            headers: [{ key: 'content-type', value: 'text' }],
            hasAuth: false,
          },
          __internal__: {
            hasHeaders: true,
          },
          isDeprecated: false,
        },
        isValid: true,
      });
    });

    it('connector validation succeeds without headers', async () => {
      const connector = {
        ...actionConnector,
        config: {
          method: 'PUT',
          url: 'https://test.com',
          hasAuth: true,
        },
      };

      const { getByTestId } = render(
        <ConnectorFormTestProvider connector={connector} onSubmit={onSubmit}>
          <WebhookActionConnectorFields
            readOnly={false}
            isEdit={false}
            registerPreSubmitValidator={() => {}}
          />
        </ConnectorFormTestProvider>
      );

      await act(async () => {
        userEvent.click(getByTestId('form-test-provide-submit'));
      });

      expect(onSubmit).toBeCalledWith({
        data: {
          actionTypeId: '.webhook',
          name: 'webhook',
          config: {
            method: 'PUT',
            url: 'https://test.com',
            hasAuth: true,
          },
          secrets: {
            user: 'user',
            password: 'pass',
          },
          __internal__: {
            hasHeaders: false,
          },
          isDeprecated: false,
        },
        isValid: true,
      });
    });

    it('validates correctly if the method is empty', async () => {
      const connector = {
        ...actionConnector,
        config: {
          ...actionConnector.config,
          method: '',
        },
      };

      const res = render(
        <ConnectorFormTestProvider connector={connector} onSubmit={onSubmit}>
          <WebhookActionConnectorFields
            readOnly={false}
            isEdit={false}
            registerPreSubmitValidator={() => {}}
          />
        </ConnectorFormTestProvider>
      );

      await act(async () => {
        userEvent.click(res.getByTestId('form-test-provide-submit'));
      });

      expect(onSubmit).toHaveBeenCalledWith({ data: {}, isValid: false });
    });

    it.each(tests)('validates correctly %p', async (field, value) => {
      const connector = {
        ...actionConnector,
        config: {
          ...actionConnector.config,
          headers: [],
        },
      };

      const res = render(
        <ConnectorFormTestProvider connector={connector} onSubmit={onSubmit}>
          <WebhookActionConnectorFields
            readOnly={false}
            isEdit={false}
            registerPreSubmitValidator={() => {}}
          />
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
