/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { AppMockRenderer, ConnectorFormTestProvider, createAppMockRenderer } from '../test_utils';
import ServiceNowConnectorFieldsNoApp from './servicenow_connectors_no_app';

describe('ServiceNowActionConnectorFields renders', () => {
  const basicAuthConnector = {
    id: 'test',
    actionTypeId: '.servicenow',
    isDeprecated: true,
    name: 'SN',
    config: {
      apiUrl: 'https://test.com',
      isOAuth: false,
      usesTableApi: false,
    },
    secrets: {
      username: 'user',
      password: 'pass',
    },
  };

  const oauthConnector = {
    id: 'test',
    actionTypeId: '.servicenow',
    isDeprecated: true,
    name: 'SN',
    config: {
      apiUrl: 'https://test.com',
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

  let appMockRenderer: AppMockRenderer;
  beforeEach(() => {
    jest.clearAllMocks();
    appMockRenderer = createAppMockRenderer();
  });

  it('renders a basic auth connector', () => {
    const { getByTestId } = appMockRenderer.render(
      <ConnectorFormTestProvider connector={basicAuthConnector}>
        <ServiceNowConnectorFieldsNoApp
          readOnly={false}
          isEdit={false}
          registerPreSubmitValidator={() => {}}
        />
      </ConnectorFormTestProvider>
    );

    expect(getByTestId('credentialsApiUrlFromInput')).toBeInTheDocument();
    expect(getByTestId('connector-servicenow-username-form-input')).toBeInTheDocument();
    expect(getByTestId('connector-servicenow-password-form-input')).toBeInTheDocument();
  });

  it('renders an oauth connector', () => {
    const { getByTestId } = appMockRenderer.render(
      <ConnectorFormTestProvider connector={oauthConnector}>
        <ServiceNowConnectorFieldsNoApp
          readOnly={false}
          isEdit={false}
          registerPreSubmitValidator={() => {}}
        />
      </ConnectorFormTestProvider>
    );

    expect(getByTestId('credentialsApiUrlFromInput')).toBeInTheDocument();
    expect(getByTestId('connector-servicenow-client-id-form-input')).toBeInTheDocument();
    expect(getByTestId('connector-servicenow-user-identifier-form-input')).toBeInTheDocument();
    expect(getByTestId('connector-servicenow-jwt-key-id-form-input')).toBeInTheDocument();
    expect(getByTestId('connector-servicenow-client-secret-form-input')).toBeInTheDocument();
    expect(getByTestId('connector-servicenow-private-key-form-input')).toBeInTheDocument();
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

    it.each(basicAuthTests)('validates correctly %p', async (field, value) => {
      const res = appMockRenderer.render(
        <ConnectorFormTestProvider connector={basicAuthConnector} onSubmit={onSubmit}>
          <ServiceNowConnectorFieldsNoApp
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
      const res = appMockRenderer.render(
        <ConnectorFormTestProvider connector={oauthConnector} onSubmit={onSubmit}>
          <ServiceNowConnectorFieldsNoApp
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
