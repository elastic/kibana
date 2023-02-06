/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, within } from '@testing-library/react';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import { render, act as reactAct } from '@testing-library/react';

import { ConnectorValidationFunc } from '@kbn/triggers-actions-ui-plugin/public/types';
import { useKibana } from '@kbn/triggers-actions-ui-plugin/public';
import { updateActionConnector } from '@kbn/triggers-actions-ui-plugin/public/application/lib/action_connector_api';
import ServiceNowConnectorFields from './servicenow_connectors';
import { getAppInfo } from './api';
import { ConnectorFormTestProvider } from '../test_utils';
import { mount } from 'enzyme';
import userEvent from '@testing-library/user-event';

jest.mock('@kbn/triggers-actions-ui-plugin/public/common/lib/kibana');
jest.mock('@kbn/triggers-actions-ui-plugin/public/application/lib/action_connector_api');
jest.mock('./api');

const useKibanaMock = useKibana as jest.Mocked<typeof useKibana>;
const getAppInfoMock = getAppInfo as jest.Mock;
const updateActionConnectorMock = updateActionConnector as jest.Mock;

describe('ServiceNowActionConnectorFields renders', () => {
  const usesTableApiConnector = {
    id: 'test',
    actionTypeId: '.servicenow',
    isDeprecated: true,
    name: 'SN',
    config: {
      apiUrl: 'https://test.com',
      usesTableApi: true,
    },
    secrets: {
      username: 'user',
      password: 'pass',
    },
  };

  const usesImportSetApiConnector = {
    ...usesTableApiConnector,
    isDeprecated: false,
    config: {
      ...usesTableApiConnector.config,
      isOAuth: false,
      usesTableApi: false,
    },
  };

  const usesImportSetApiConnectorOauth = {
    ...usesTableApiConnector,
    isDeprecated: false,
    config: {
      ...usesTableApiConnector.config,
      isOAuth: true,
      usesTableApi: false,
      clientId: 'test-id',
      userIdentifierValue: 'email',
      jwtKeyId: 'test-id',
    },
    secrets: {
      clientSecret: 'secret',
      privateKey: 'secret-key',
      privateKeyPassword: 'secret-pass',
    },
  };

  test('alerting servicenow connector fields are rendered', () => {
    const wrapper = mountWithIntl(
      <ConnectorFormTestProvider connector={usesTableApiConnector}>
        <ServiceNowConnectorFields
          readOnly={false}
          isEdit={false}
          registerPreSubmitValidator={() => {}}
        />
      </ConnectorFormTestProvider>
    );
    expect(
      wrapper.find('[data-test-subj="connector-servicenow-username-form-input"]').length > 0
    ).toBeTruthy();

    expect(wrapper.find('[data-test-subj="credentialsApiUrlFromInput"]').length > 0).toBeTruthy();
    expect(
      wrapper.find('[data-test-subj="connector-servicenow-password-form-input"]').length > 0
    ).toBeTruthy();
  });

  test('case specific servicenow connector fields is rendered', () => {
    const wrapper = mountWithIntl(
      <ConnectorFormTestProvider connector={usesImportSetApiConnector}>
        <ServiceNowConnectorFields
          readOnly={false}
          isEdit={false}
          registerPreSubmitValidator={() => {}}
        />
      </ConnectorFormTestProvider>
    );

    expect(wrapper.find('[data-test-subj="credentialsApiUrlFromInput"]').length > 0).toBeTruthy();
    expect(
      wrapper.find('[data-test-subj="connector-servicenow-password-form-input"]').length > 0
    ).toBeTruthy();
  });

  describe('Elastic certified ServiceNow application', () => {
    const { services } = useKibanaMock();
    const applicationInfoData = {
      name: 'Elastic',
      scope: 'x_elas2_inc_int',
      version: '1.0.0',
    };

    let preSubmitValidator: ConnectorValidationFunc;

    const registerPreSubmitValidator = (validator: ConnectorValidationFunc) => {
      preSubmitValidator = validator;
    };

    beforeEach(() => {
      jest.clearAllMocks();
    });

    test('should render the correct callouts when the connectors needs the application', () => {
      const wrapper = mountWithIntl(
        <ConnectorFormTestProvider connector={usesImportSetApiConnector}>
          <ServiceNowConnectorFields
            readOnly={false}
            isEdit={false}
            registerPreSubmitValidator={registerPreSubmitValidator}
          />
        </ConnectorFormTestProvider>
      );

      expect(wrapper.find('[data-test-subj="snInstallationCallout"]').exists()).toBeTruthy();
      expect(wrapper.find('[data-test-subj="snDeprecatedCallout"]').exists()).toBeFalsy();
      expect(wrapper.find('[data-test-subj="snApplicationCallout"]').exists()).toBeFalsy();
    });

    test('should render the correct callouts if the connector uses the table API', () => {
      const wrapper = mountWithIntl(
        <ConnectorFormTestProvider connector={usesTableApiConnector}>
          <ServiceNowConnectorFields
            readOnly={false}
            isEdit={false}
            registerPreSubmitValidator={registerPreSubmitValidator}
          />
        </ConnectorFormTestProvider>
      );

      expect(wrapper.find('[data-test-subj="snInstallationCallout"]').exists()).toBeFalsy();
      expect(wrapper.find('[data-test-subj="snDeprecatedCallout"]').exists()).toBeTruthy();
      expect(wrapper.find('[data-test-subj="snApplicationCallout"]').exists()).toBeFalsy();
    });

    test('should get application information when saving the connector', async () => {
      getAppInfoMock.mockResolvedValue(applicationInfoData);

      const wrapper = mountWithIntl(
        <ConnectorFormTestProvider connector={usesImportSetApiConnector}>
          <ServiceNowConnectorFields
            readOnly={false}
            isEdit={false}
            registerPreSubmitValidator={registerPreSubmitValidator}
          />
        </ConnectorFormTestProvider>
      );

      await act(async () => {
        await preSubmitValidator();
      });

      expect(getAppInfoMock).toHaveBeenCalledTimes(1);
      expect(wrapper.find('[data-test-subj="snApplicationCallout"]').exists()).toBeFalsy();
    });

    test('should NOT get application information when the connector uses the old API', async () => {
      const wrapper = mountWithIntl(
        <ConnectorFormTestProvider connector={usesTableApiConnector}>
          <ServiceNowConnectorFields
            readOnly={false}
            isEdit={false}
            registerPreSubmitValidator={registerPreSubmitValidator}
          />
        </ConnectorFormTestProvider>
      );

      await act(async () => {
        await preSubmitValidator();
      });

      expect(getAppInfoMock).toHaveBeenCalledTimes(0);
      expect(wrapper.find('[data-test-subj="snApplicationCallout"]').exists()).toBeFalsy();
    });

    test('should render error when save failed', async () => {
      const errorMessage = 'request failed';
      getAppInfoMock.mockRejectedValueOnce(new Error(errorMessage));

      mountWithIntl(
        <ConnectorFormTestProvider connector={usesImportSetApiConnector}>
          <ServiceNowConnectorFields
            readOnly={false}
            isEdit={false}
            registerPreSubmitValidator={registerPreSubmitValidator}
          />
        </ConnectorFormTestProvider>
      );

      await act(async () => {
        const res = await preSubmitValidator();
        const messageWrapper = mount(<>{res?.message}</>);

        expect(getAppInfoMock).toHaveBeenCalledTimes(1);
        expect(
          messageWrapper.find('[data-test-subj="snApplicationCallout"]').exists()
        ).toBeTruthy();

        expect(
          messageWrapper
            .find('[data-test-subj="snApplicationCallout"]')
            .first()
            .text()
            .includes(errorMessage)
        ).toBeTruthy();
      });
    });

    test('should render error when the response is a REST api error', async () => {
      const errorMessage = 'request failed';
      getAppInfoMock.mockResolvedValue({ error: { message: errorMessage }, status: 'failure' });

      mountWithIntl(
        <ConnectorFormTestProvider connector={usesImportSetApiConnector}>
          <ServiceNowConnectorFields
            readOnly={false}
            isEdit={false}
            registerPreSubmitValidator={registerPreSubmitValidator}
          />
        </ConnectorFormTestProvider>
      );

      await act(async () => {
        const res = await preSubmitValidator();
        const messageWrapper = mount(<>{res?.message}</>);

        expect(getAppInfoMock).toHaveBeenCalledTimes(1);
        expect(
          messageWrapper.find('[data-test-subj="snApplicationCallout"]').exists()
        ).toBeTruthy();

        expect(
          messageWrapper
            .find('[data-test-subj="snApplicationCallout"]')
            .first()
            .text()
            .includes(errorMessage)
        ).toBeTruthy();
      });
    });

    test('should migrate the deprecated connector correctly', async () => {
      getAppInfoMock.mockResolvedValue(applicationInfoData);
      updateActionConnectorMock.mockResolvedValue({ isDeprecated: false });

      const { getByTestId, queryByTestId } = render(
        <ConnectorFormTestProvider connector={usesTableApiConnector}>
          <ServiceNowConnectorFields
            readOnly={false}
            isEdit={false}
            registerPreSubmitValidator={registerPreSubmitValidator}
          />
        </ConnectorFormTestProvider>
      );

      await reactAct(async () => {
        userEvent.click(getByTestId('update-connector-btn'));
      });

      await reactAct(async () => {
        const updateConnectorForm = getByTestId('updateConnectorForm');
        const urlInput = within(updateConnectorForm).getByTestId('credentialsApiUrlFromInput');
        const usernameInput = within(updateConnectorForm).getByTestId(
          'connector-servicenow-username-form-input'
        );
        const passwordInput = within(updateConnectorForm).getByTestId(
          'connector-servicenow-password-form-input'
        );

        await userEvent.type(urlInput, 'https://example.com', { delay: 100 });
        await userEvent.type(usernameInput, 'user', { delay: 100 });
        await userEvent.type(passwordInput, 'pass', { delay: 100 });
        userEvent.click(within(updateConnectorForm).getByTestId('snUpdateInstallationSubmit'));
      });

      expect(getAppInfoMock).toHaveBeenCalledTimes(1);
      expect(updateActionConnectorMock).toHaveBeenCalledWith(
        expect.objectContaining({
          connector: {
            config: { apiUrl: 'https://example.com', usesTableApi: false },
            id: 'test',
            name: 'SN',
            secrets: { password: 'pass', username: 'user' },
          },
        })
      );

      expect(services.notifications.toasts.addSuccess).toHaveBeenCalledWith({
        text: 'Connector has been updated.',
        title: 'SN connector updated',
      });

      expect(queryByTestId('updateConnectorForm')).toBe(null);
      expect(queryByTestId('snDeprecatedCallout')).toBe(null);
      expect(getByTestId('snInstallationCallout')).toBeInTheDocument();
    });

    test('should NOT migrate the deprecated connector when there is an error', async () => {
      const errorMessage = 'request failed';
      getAppInfoMock.mockRejectedValueOnce(new Error(errorMessage));
      updateActionConnectorMock.mockResolvedValue({ isDeprecated: false });

      const { getByTestId } = render(
        <ConnectorFormTestProvider connector={usesTableApiConnector}>
          <ServiceNowConnectorFields
            readOnly={false}
            isEdit={false}
            registerPreSubmitValidator={registerPreSubmitValidator}
          />
        </ConnectorFormTestProvider>
      );

      await reactAct(async () => {
        userEvent.click(getByTestId('update-connector-btn'));
      });

      await reactAct(async () => {
        const updateConnectorForm = getByTestId('updateConnectorForm');
        const urlInput = within(updateConnectorForm).getByTestId('credentialsApiUrlFromInput');
        const usernameInput = within(updateConnectorForm).getByTestId(
          'connector-servicenow-username-form-input'
        );
        const passwordInput = within(updateConnectorForm).getByTestId(
          'connector-servicenow-password-form-input'
        );

        await userEvent.type(urlInput, 'https://example.com', { delay: 100 });
        await userEvent.type(usernameInput, 'user', { delay: 100 });
        await userEvent.type(passwordInput, 'pass', { delay: 100 });
        userEvent.click(within(updateConnectorForm).getByTestId('snUpdateInstallationSubmit'));
      });

      expect(getAppInfoMock).toHaveBeenCalledTimes(1);
      expect(updateActionConnectorMock).not.toHaveBeenCalled();
      expect(services.notifications.toasts.addSuccess).not.toHaveBeenCalled();
      expect(getByTestId('updateConnectorForm')).toBeInTheDocument();
      expect(
        within(getByTestId('updateConnectorForm')).getByTestId('snApplicationCallout')
      ).toBeInTheDocument();
    });
  });

  describe('Validation', () => {
    const onSubmit = jest.fn();

    beforeEach(() => {
      jest.clearAllMocks();
    });

    const basicAuthTests: Array<[string, string]> = [
      ['credentialsApiUrlFromInput', 'not-valid'],
      ['connector-servicenow-username-form-input', ''],
      ['connector-servicenow-password-form-input', ''],
    ];

    const oauthTests: Array<[string, string]> = [
      ['credentialsApiUrlFromInput', 'not-valid'],
      ['connector-servicenow-client-id-form-input', ''],
      ['connector-servicenow-user-identifier-form-input', ''],
      ['connector-servicenow-jwt-key-id-form-input', ''],
      ['connector-servicenow-client-secret-form-input', ''],
      ['connector-servicenow-private-key-form-input', ''],
    ];

    it.each([[usesImportSetApiConnector], [usesImportSetApiConnectorOauth]])(
      'connector validation succeeds when connector config is valid',
      async (connector) => {
        const { getByTestId } = render(
          <ConnectorFormTestProvider connector={connector} onSubmit={onSubmit}>
            <ServiceNowConnectorFields
              readOnly={false}
              isEdit={false}
              registerPreSubmitValidator={() => {}}
            />
          </ConnectorFormTestProvider>
        );

        await act(async () => {
          userEvent.click(getByTestId('form-test-provide-submit'));
        });

        expect(onSubmit).toHaveBeenCalledWith({ data: { ...connector }, isValid: true });
      }
    );

    it('submits if the private key password is empty', async () => {
      const connector = {
        ...usesImportSetApiConnectorOauth,
        secrets: {
          ...usesImportSetApiConnectorOauth.secrets,
          clientSecret: 'secret',
          privateKey: 'secret-key',
          privateKeyPassword: '',
        },
      };

      const { getByTestId } = render(
        <ConnectorFormTestProvider connector={connector} onSubmit={onSubmit}>
          <ServiceNowConnectorFields
            readOnly={false}
            isEdit={false}
            registerPreSubmitValidator={() => {}}
          />
        </ConnectorFormTestProvider>
      );

      await act(async () => {
        userEvent.click(getByTestId('form-test-provide-submit'));
      });

      const {
        secrets: { clientSecret, privateKey },
        ...rest
      } = connector;

      expect(onSubmit).toHaveBeenCalledWith({
        data: { ...rest, secrets: { clientSecret, privateKey } },
        isValid: true,
      });
    });

    it.each(basicAuthTests)('validates correctly %p', async (field, value) => {
      const res = render(
        <ConnectorFormTestProvider connector={usesImportSetApiConnector} onSubmit={onSubmit}>
          <ServiceNowConnectorFields
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

    it.each(oauthTests)('validates correctly %p', async (field, value) => {
      const res = render(
        <ConnectorFormTestProvider connector={usesImportSetApiConnectorOauth} onSubmit={onSubmit}>
          <ServiceNowConnectorFields
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
