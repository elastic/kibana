/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Suspense } from 'react';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import { act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useKibana } from '@kbn/triggers-actions-ui-plugin/public';
import EmailActionConnectorFields from './email_connector';
import * as hooks from './use_email_config';
import {
  AppMockRenderer,
  ConnectorFormTestProvider,
  createAppMockRenderer,
  waitForComponentToUpdate,
} from '../lib/test_utils';

jest.mock('@kbn/triggers-actions-ui-plugin/public/common/lib/kibana');
const useKibanaMock = useKibana as jest.Mocked<typeof useKibana>;

describe('EmailActionConnectorFields', () => {
  test('all connector fields are rendered', async () => {
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
      },
      isDeprecated: false,
    };

    const wrapper = mountWithIntl(
      <ConnectorFormTestProvider connector={actionConnector}>
        <EmailActionConnectorFields
          readOnly={false}
          isEdit={false}
          registerPreSubmitValidator={() => {}}
        />
      </ConnectorFormTestProvider>
    );

    await waitForComponentToUpdate();

    expect(wrapper.find('[data-test-subj="emailFromInput"]').length > 0).toBeTruthy();
    expect(wrapper.find('[data-test-subj="emailFromInput"]').first().prop('value')).toBe(
      'test@test.com'
    );
    expect(wrapper.find('[data-test-subj="emailServiceSelectInput"]').length > 0).toBeTruthy();
    expect(wrapper.find('[data-test-subj="emailHostInput"]').length > 0).toBeTruthy();
    expect(wrapper.find('[data-test-subj="emailPortInput"]').length > 0).toBeTruthy();
    expect(wrapper.find('[data-test-subj="emailUserInput"]').length > 0).toBeTruthy();
    expect(wrapper.find('[data-test-subj="emailPasswordInput"]').length > 0).toBeTruthy();
  });

  test('secret connector fields are not rendered when hasAuth false', async () => {
    const actionConnector = {
      secrets: {},
      id: 'test',
      actionTypeId: '.email',
      name: 'email',
      config: {
        from: 'test@test.com',
        hasAuth: false,
      },
      isDeprecated: false,
    };

    const wrapper = mountWithIntl(
      <ConnectorFormTestProvider connector={actionConnector}>
        <EmailActionConnectorFields
          readOnly={false}
          isEdit={false}
          registerPreSubmitValidator={() => {}}
        />
      </ConnectorFormTestProvider>
    );

    await waitForComponentToUpdate();

    expect(wrapper.find('[data-test-subj="emailFromInput"]').length > 0).toBeTruthy();
    expect(wrapper.find('[data-test-subj="emailFromInput"]').first().prop('value')).toBe(
      'test@test.com'
    );
    expect(wrapper.find('[data-test-subj="emailHostInput"]').length > 0).toBeTruthy();
    expect(wrapper.find('[data-test-subj="emailPortInput"]').length > 0).toBeTruthy();
    expect(wrapper.find('[data-test-subj="emailUserInput"]').length > 0).toBeFalsy();
    expect(wrapper.find('[data-test-subj="emailPasswordInput"]').length > 0).toBeFalsy();
  });

  test('service field defaults to empty when not defined', async () => {
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
      },
      isDeprecated: false,
    };

    const wrapper = mountWithIntl(
      <ConnectorFormTestProvider connector={actionConnector}>
        <EmailActionConnectorFields
          readOnly={false}
          isEdit={false}
          registerPreSubmitValidator={() => {}}
        />
      </ConnectorFormTestProvider>
    );

    await waitForComponentToUpdate();

    expect(wrapper.find('[data-test-subj="emailFromInput"]').first().prop('value')).toBe(
      'test@test.com'
    );
    expect(wrapper.find('[data-test-subj="emailServiceSelectInput"]').length > 0).toBeTruthy();
    expect(wrapper.find('select[data-test-subj="emailServiceSelectInput"]').prop('value')).toEqual(
      ''
    );
  });

  test('service field are correctly selected when defined', async () => {
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
        service: 'gmail',
      },
      isDeprecated: false,
    };

    const wrapper = mountWithIntl(
      <ConnectorFormTestProvider connector={actionConnector}>
        <EmailActionConnectorFields
          readOnly={false}
          isEdit={false}
          registerPreSubmitValidator={() => {}}
        />
      </ConnectorFormTestProvider>
    );

    await waitForComponentToUpdate();

    expect(wrapper.find('[data-test-subj="emailServiceSelectInput"]').length > 0).toBeTruthy();
    expect(wrapper.find('select[data-test-subj="emailServiceSelectInput"]').prop('value')).toEqual(
      'gmail'
    );
  });

  test('host, port and secure fields should be disabled when service field is set to well known service', async () => {
    const getEmailServiceConfig = jest
      .fn()
      .mockResolvedValue({ host: 'https://example.com', port: 80, secure: false });
    jest
      .spyOn(hooks, 'useEmailConfig')
      .mockImplementation(() => ({ isLoading: false, getEmailServiceConfig }));

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
        service: 'gmail',
      },
      isDeprecated: false,
    };

    const wrapper = mountWithIntl(
      <ConnectorFormTestProvider connector={actionConnector}>
        <EmailActionConnectorFields
          readOnly={false}
          isEdit={false}
          registerPreSubmitValidator={() => {}}
        />
      </ConnectorFormTestProvider>
    );

    await waitForComponentToUpdate();

    wrapper.update();
    expect(wrapper.find('[data-test-subj="emailHostInput"]').first().prop('disabled')).toBe(true);
    expect(wrapper.find('[data-test-subj="emailPortInput"]').first().prop('disabled')).toBe(true);
    expect(wrapper.find('[data-test-subj="emailSecureSwitch"]').first().prop('disabled')).toBe(
      true
    );
  });

  test('host, port and secure fields should not be disabled when service field is set to other', async () => {
    const getEmailServiceConfig = jest
      .fn()
      .mockResolvedValue({ host: 'https://example.com', port: 80, secure: false });
    jest
      .spyOn(hooks, 'useEmailConfig')
      .mockImplementation(() => ({ isLoading: false, getEmailServiceConfig }));

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

    const wrapper = mountWithIntl(
      <ConnectorFormTestProvider connector={actionConnector}>
        <EmailActionConnectorFields
          readOnly={false}
          isEdit={false}
          registerPreSubmitValidator={() => {}}
        />
      </ConnectorFormTestProvider>
    );

    await waitForComponentToUpdate();

    expect(wrapper.find('[data-test-subj="emailHostInput"]').first().prop('disabled')).toBe(false);
    expect(wrapper.find('[data-test-subj="emailPortInput"]').first().prop('disabled')).toBe(false);
    expect(wrapper.find('[data-test-subj="emailSecureSwitch"]').first().prop('disabled')).toBe(
      false
    );
  });

  describe('Validation', () => {
    let appMockRenderer: AppMockRenderer;
    const onSubmit = jest.fn();
    const validateEmailAddresses = jest.fn();

    beforeEach(() => {
      jest.clearAllMocks();
      appMockRenderer = createAppMockRenderer();
      validateEmailAddresses.mockReturnValue([{ valid: true }]);
    });

    it('submits the connector', async () => {
      const actionConnector = {
        secrets: {
          user: 'user',
          password: 'pass',
          clientSecret: null,
        },
        id: 'test',
        actionTypeId: '.email',
        name: 'email',
        config: {
          from: 'test@test.com',
          port: 2323,
          host: 'localhost',
          test: 'test',
          hasAuth: true,
          service: 'other',
        },
        isDeprecated: false,
      };

      const { getByTestId } = appMockRenderer.render(
        <ConnectorFormTestProvider
          connector={actionConnector}
          onSubmit={onSubmit}
          connectorServices={{ validateEmailAddresses }}
        >
          <EmailActionConnectorFields
            readOnly={false}
            isEdit={false}
            registerPreSubmitValidator={() => {}}
          />
        </ConnectorFormTestProvider>
      );

      await waitForComponentToUpdate();

      await act(async () => {
        userEvent.click(getByTestId('form-test-provide-submit'));
      });

      expect(onSubmit).toBeCalledWith({
        data: {
          actionTypeId: '.email',
          config: {
            from: 'test@test.com',
            hasAuth: true,
            host: 'localhost',
            port: 2323,
            secure: false,
            service: 'other',
          },
          id: 'test',
          isDeprecated: false,
          name: 'email',
          secrets: {
            user: 'user',
            password: 'pass',
          },
        },
        isValid: true,
      });
    });

    it('submits the connector with auth false', async () => {
      const actionConnector = {
        secrets: {
          user: null,
          password: null,
          clientSecret: null,
        },
        id: 'test',
        actionTypeId: '.email',
        name: 'email',
        config: {
          from: 'test@test.com',
          port: 2323,
          host: 'localhost',
          test: 'test',
          hasAuth: false,
          service: 'other',
        },
        isDeprecated: false,
      };

      const { getByTestId } = appMockRenderer.render(
        <ConnectorFormTestProvider
          connector={actionConnector}
          onSubmit={onSubmit}
          connectorServices={{ validateEmailAddresses }}
        >
          <EmailActionConnectorFields
            readOnly={false}
            isEdit={false}
            registerPreSubmitValidator={() => {}}
          />
        </ConnectorFormTestProvider>
      );

      await waitForComponentToUpdate();

      await act(async () => {
        userEvent.click(getByTestId('form-test-provide-submit'));
      });

      expect(onSubmit).toBeCalledWith({
        data: {
          actionTypeId: '.email',
          config: {
            from: 'test@test.com',
            port: 2323,
            host: 'localhost',
            hasAuth: false,
            service: 'other',
            secure: false,
          },
          id: 'test',
          isDeprecated: false,
          name: 'email',
        },
        isValid: true,
      });
    });

    it('connector validation fails when connector config is not valid', async () => {
      useKibanaMock().services.actions.validateEmailAddresses = jest
        .fn()
        .mockReturnValue([{ valid: false }]);
      const actionConnector = {
        secrets: {
          user: 'user',
          password: 'pass',
        },
        id: 'test',
        actionTypeId: '.email',
        name: 'email',
        config: {
          from: 'test@notallowed.com',
          hasAuth: true,
          service: 'other',
        },
        isDeprecated: false,
      };

      const { getByTestId } = appMockRenderer.render(
        <ConnectorFormTestProvider
          connector={actionConnector}
          onSubmit={onSubmit}
          connectorServices={{ validateEmailAddresses }}
        >
          <EmailActionConnectorFields
            readOnly={false}
            isEdit={false}
            registerPreSubmitValidator={() => {}}
          />
        </ConnectorFormTestProvider>
      );

      await waitForComponentToUpdate();

      await act(async () => {
        userEvent.click(getByTestId('form-test-provide-submit'));
      });

      expect(onSubmit).toBeCalledWith({
        data: {},
        isValid: false,
      });
    });

    it('connector validation fails when user specified but not password', async () => {
      const actionConnector = {
        secrets: {
          user: 'user',
          password: '',
          clientSecret: null,
        },
        id: 'test',
        actionTypeId: '.email',
        isPreconfigured: false,
        isDeprecated: false,
        name: 'email',
        config: {
          from: 'test@test.com',
          port: 2323,
          host: 'localhost',
          test: 'test',
          hasAuth: true,
          service: 'other',
        },
      };

      const { getByTestId } = appMockRenderer.render(
        <ConnectorFormTestProvider
          connector={actionConnector}
          onSubmit={onSubmit}
          connectorServices={{ validateEmailAddresses }}
        >
          <EmailActionConnectorFields
            readOnly={false}
            isEdit={false}
            registerPreSubmitValidator={() => {}}
          />
        </ConnectorFormTestProvider>
      );

      await waitForComponentToUpdate();

      await act(async () => {
        userEvent.click(getByTestId('form-test-provide-submit'));
      });

      expect(onSubmit).toBeCalledWith({
        data: {},
        isValid: false,
      });
    });

    it('connector validation fails when server type is not selected', async () => {
      const actionConnector = {
        secrets: {
          user: 'user',
          password: 'password',
        },
        id: 'test',
        actionTypeId: '.email',
        isPreconfigured: false,
        isDeprecated: false,
        name: 'email',
        config: {
          from: 'test@test.com',
          port: 2323,
          host: 'localhost',
          test: 'test',
          hasAuth: true,
        },
      };

      const { getByTestId } = appMockRenderer.render(
        <ConnectorFormTestProvider
          connector={actionConnector}
          onSubmit={onSubmit}
          connectorServices={{ validateEmailAddresses }}
        >
          <EmailActionConnectorFields
            readOnly={false}
            isEdit={false}
            registerPreSubmitValidator={() => {}}
          />
        </ConnectorFormTestProvider>
      );

      await waitForComponentToUpdate();

      await act(async () => {
        userEvent.click(getByTestId('form-test-provide-submit'));
      });

      expect(onSubmit).toBeCalledWith({
        data: {},
        isValid: false,
      });
    });

    it('connector validation fails when exchange service is selected, but clientId, tenantId and clientSecrets were not defined', async () => {
      const actionConnector = {
        secrets: {
          user: 'user',
          password: 'pass',
          clientSecret: null,
        },
        id: 'test',
        actionTypeId: '.email',
        name: 'email',
        isPreconfigured: false,
        isDeprecated: false,
        config: {
          from: 'test@test.com',
          hasAuth: true,
          service: 'exchange_server',
        },
      };

      const { getByTestId } = appMockRenderer.render(
        <ConnectorFormTestProvider
          connector={actionConnector}
          onSubmit={onSubmit}
          connectorServices={{ validateEmailAddresses }}
        >
          <Suspense fallback={null}>
            <EmailActionConnectorFields
              readOnly={false}
              isEdit={false}
              registerPreSubmitValidator={() => {}}
            />
          </Suspense>
        </ConnectorFormTestProvider>
      );

      await waitForComponentToUpdate();

      await act(async () => {
        userEvent.click(getByTestId('form-test-provide-submit'));
      });

      expect(onSubmit).toBeCalledWith({
        data: {},
        isValid: false,
      });
    });

    it.each([[123.5], ['123.5']])(
      'connector validation fails when port is not an integer: %p',
      async (port) => {
        const actionConnector = {
          secrets: {
            user: 'user',
            password: 'pass',
          },
          id: 'test',
          actionTypeId: '.email',
          name: 'email',
          config: {
            from: 'test@notallowed.com',
            hasAuth: true,
            service: 'other',
            host: 'my-host',
            port,
          },
          isDeprecated: false,
        };

        const { getByTestId } = appMockRenderer.render(
          <ConnectorFormTestProvider
            connector={actionConnector}
            onSubmit={onSubmit}
            connectorServices={{ validateEmailAddresses }}
          >
            <EmailActionConnectorFields
              readOnly={false}
              isEdit={false}
              registerPreSubmitValidator={() => {}}
            />
          </ConnectorFormTestProvider>
        );

        await waitForComponentToUpdate();

        await act(async () => {
          userEvent.click(getByTestId('form-test-provide-submit'));
        });

        expect(onSubmit).toBeCalledWith({
          data: {},
          isValid: false,
        });
      }
    );

    it.each([[123], ['123']])('connector validation pass when port is valid: %p', async (port) => {
      const actionConnector = {
        secrets: {
          user: 'user',
          password: 'pass',
        },
        id: 'test',
        actionTypeId: '.email',
        name: 'email',
        config: {
          from: 'test@notallowed.com',
          hasAuth: true,
          service: 'other',
          host: 'my-host',
          port,
        },
        isDeprecated: false,
      };

      const { getByTestId } = appMockRenderer.render(
        <ConnectorFormTestProvider
          connector={actionConnector}
          onSubmit={onSubmit}
          connectorServices={{ validateEmailAddresses }}
        >
          <EmailActionConnectorFields
            readOnly={false}
            isEdit={false}
            registerPreSubmitValidator={() => {}}
          />
        </ConnectorFormTestProvider>
      );

      await waitForComponentToUpdate();

      await act(async () => {
        userEvent.click(getByTestId('form-test-provide-submit'));
      });

      expect(onSubmit).toBeCalledWith({
        data: {
          actionTypeId: '.email',
          config: {
            from: 'test@notallowed.com',
            hasAuth: true,
            host: 'my-host',
            port,
            secure: false,
            service: 'other',
          },
          id: 'test',
          isDeprecated: false,
          name: 'email',
          secrets: {
            password: 'pass',
            user: 'user',
          },
        },
        isValid: true,
      });
    });
  });
});
