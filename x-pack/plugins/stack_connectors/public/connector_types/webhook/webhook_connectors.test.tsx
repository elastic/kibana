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
import { AuthType, SSLCertType } from '../../../common/auth/constants';

describe('WebhookActionConnectorFields renders', () => {
  it('renders all connector fields', async () => {
    const actionConnector = {
      actionTypeId: '.webhook',
      name: 'webhook',
      config: {
        method: 'PUT',
        url: 'https://test.com',
        headers: [{ key: 'content-type', value: 'text' }],
        hasAuth: true,
        authType: AuthType.Basic,
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
        await userEvent.click(getByTestId('form-test-provide-submit'));
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
            authType: AuthType.Basic,
          },
          secrets: {
            user: 'user',
            password: 'pass',
          },
          __internal__: {
            hasHeaders: true,
            hasCA: false,
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
        await userEvent.click(getByTestId('form-test-provide-submit'));
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
            authType: null,
          },
          __internal__: {
            hasHeaders: true,
            hasCA: false,
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
          authType: AuthType.Basic,
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
        await userEvent.click(getByTestId('form-test-provide-submit'));
      });

      expect(onSubmit).toBeCalledWith({
        data: {
          actionTypeId: '.webhook',
          name: 'webhook',
          config: {
            method: 'PUT',
            url: 'https://test.com',
            hasAuth: true,
            authType: AuthType.Basic,
          },
          secrets: {
            user: 'user',
            password: 'pass',
          },
          __internal__: {
            hasHeaders: false,
            hasCA: false,
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
        await userEvent.click(res.getByTestId('form-test-provide-submit'));
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

      await userEvent.clear(res.getByTestId(field));
      if (value !== '') {
        await userEvent.type(res.getByTestId(field), value, {
          delay: 10,
        });
      }

      await userEvent.click(res.getByTestId('form-test-provide-submit'));

      expect(onSubmit).toHaveBeenCalledWith({ data: {}, isValid: false });
    });

    it('validates correctly with a CA and verificationMode', async () => {
      const connector = {
        ...actionConnector,
        config: {
          ...actionConnector.config,
          ca: Buffer.from('some binary string').toString('base64'),
          verificationMode: 'full',
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
        await userEvent.click(res.getByTestId('form-test-provide-submit'));
      });

      expect(onSubmit).toHaveBeenCalledWith({
        data: {
          actionTypeId: '.webhook',
          name: 'webhook',
          config: {
            method: 'PUT',
            url: 'https://test.com',
            hasAuth: true,
            authType: AuthType.Basic,
            ca: Buffer.from('some binary string').toString('base64'),
            verificationMode: 'full',
            headers: [{ key: 'content-type', value: 'text' }],
          },
          secrets: {
            user: 'user',
            password: 'pass',
          },
          __internal__: {
            hasHeaders: true,
            hasCA: true,
          },
          isDeprecated: false,
        },
        isValid: true,
      });
    });

    it('validates correctly with a CRT and KEY', async () => {
      const connector = {
        ...actionConnector,
        config: {
          ...actionConnector.config,
          authType: AuthType.SSL,
          certType: SSLCertType.CRT,
        },
        secrets: {
          crt: Buffer.from('some binary string').toString('base64'),
          key: Buffer.from('some binary string').toString('base64'),
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
        await userEvent.click(res.getByTestId('form-test-provide-submit'));
      });

      expect(onSubmit).toHaveBeenCalledWith({
        data: {
          actionTypeId: '.webhook',
          name: 'webhook',
          config: {
            method: 'PUT',
            url: 'https://test.com',
            hasAuth: true,
            authType: AuthType.SSL,
            certType: SSLCertType.CRT,
            headers: [{ key: 'content-type', value: 'text' }],
          },
          secrets: {
            crt: Buffer.from('some binary string').toString('base64'),
            key: Buffer.from('some binary string').toString('base64'),
          },
          __internal__: {
            hasHeaders: true,
            hasCA: false,
          },
          isDeprecated: false,
        },
        isValid: true,
      });
    });

    it('validates correctly with a PFX', async () => {
      const connector = {
        ...actionConnector,
        config: {
          ...actionConnector.config,
          authType: AuthType.SSL,
          certType: SSLCertType.PFX,
        },
        secrets: {
          pfx: Buffer.from('some binary string').toString('base64'),
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
        await userEvent.click(res.getByTestId('form-test-provide-submit'));
      });

      expect(onSubmit).toHaveBeenCalledWith({
        data: {
          actionTypeId: '.webhook',
          name: 'webhook',
          config: {
            method: 'PUT',
            url: 'https://test.com',
            hasAuth: true,
            authType: AuthType.SSL,
            certType: SSLCertType.PFX,
            headers: [{ key: 'content-type', value: 'text' }],
          },
          secrets: {
            pfx: Buffer.from('some binary string').toString('base64'),
          },
          __internal__: {
            hasHeaders: true,
            hasCA: false,
          },
          isDeprecated: false,
        },
        isValid: true,
      });
    });

    it('fails to validate with a CRT but no KEY', async () => {
      const connector = {
        ...actionConnector,
        config: {
          ...actionConnector.config,
          authType: AuthType.SSL,
          certType: SSLCertType.CRT,
        },
        secrets: {
          crt: Buffer.from('some binary string').toString('base64'),
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
        await userEvent.click(res.getByTestId('form-test-provide-submit'));
      });

      expect(onSubmit).toHaveBeenCalledWith({
        data: {},
        isValid: false,
      });
    });
  });
});
