/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import GeminiConnectorFields from './connector';
import { ConnectorFormTestProvider } from '../lib/test_utils';
import { act, fireEvent, render, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useKibana } from '@kbn/triggers-actions-ui-plugin/public';
import { DEFAULT_GEMINI_MODEL } from '../../../common/gemini/constants';
import { useGetDashboard } from '../lib/gen_ai/use_get_dashboard';
import { createStartServicesMock } from '@kbn/triggers-actions-ui-plugin/public/common/lib/kibana/kibana_react.mock';

const mockUseKibanaReturnValue = createStartServicesMock();
jest.mock('@kbn/triggers-actions-ui-plugin/public/common/lib/kibana', () => ({
  __esModule: true,
  useKibana: jest.fn(() => ({
    services: mockUseKibanaReturnValue,
  })),
}));
jest.mock('../lib/gen_ai/use_get_dashboard');

const useKibanaMock = useKibana as jest.Mocked<typeof useKibana>;
const mockDashboard = useGetDashboard as jest.Mock;
const geminiConnector = {
  actionTypeId: '.gemini',
  name: 'gemini',
  id: '123',
  config: {
    apiUrl: 'https://geminiurl.com',
    defaultModel: DEFAULT_GEMINI_MODEL,
    gcpRegion: 'us-central-1',
    gcpProjectID: 'test-project',
  },
  secrets: {
    credentialsJSON: JSON.stringify({
      type: 'service_account',
      project_id: '',
      private_key_id: '',
      private_key: '-----BEGIN PRIVATE KEY----------END PRIVATE KEY-----\n',
      client_email: '',
      client_id: '',
      auth_uri: 'https://accounts.google.com/o/oauth2/auth',
      token_uri: 'https://oauth2.googleapis.com/token',
      auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
      client_x509_cert_url: '',
    }),
  },
  isDeprecated: false,
};

const navigateToUrl = jest.fn();

describe('GeminiConnectorFields renders', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useKibanaMock().services.application.navigateToUrl = navigateToUrl;
    mockDashboard.mockImplementation(({ connectorId }) => ({
      dashboardUrl: `https://dashboardurl.com/${connectorId}`,
    }));
  });

  test('Gemini connector fields are rendered', async () => {
    const { getAllByTestId } = render(
      <ConnectorFormTestProvider connector={geminiConnector}>
        <GeminiConnectorFields
          readOnly={false}
          isEdit={false}
          registerPreSubmitValidator={() => {}}
        />
      </ConnectorFormTestProvider>
    );

    expect(getAllByTestId('config.apiUrl-input')[0]).toBeInTheDocument();
    expect(getAllByTestId('config.apiUrl-input')[0]).toHaveValue(geminiConnector.config.apiUrl);
    expect(getAllByTestId('config.defaultModel-input')[0]).toBeInTheDocument();
    expect(getAllByTestId('config.defaultModel-input')[0]).toHaveValue(
      geminiConnector.config.defaultModel
    );
    expect(getAllByTestId('gemini-api-doc')[0]).toBeInTheDocument();
    expect(getAllByTestId('gemini-api-model-doc')[0]).toBeInTheDocument();
  });

  describe('Dashboard link', () => {
    it('Does not render if isEdit is false and dashboardUrl is defined', async () => {
      const { queryByTestId } = render(
        <ConnectorFormTestProvider connector={geminiConnector}>
          <GeminiConnectorFields
            readOnly={false}
            isEdit={false}
            registerPreSubmitValidator={() => {}}
          />
        </ConnectorFormTestProvider>
      );
      expect(queryByTestId('link-gen-ai-token-dashboard')).not.toBeInTheDocument();
    });
    it('Does not render if isEdit is true and dashboardUrl is null', async () => {
      mockDashboard.mockImplementation((id: string) => ({
        dashboardUrl: null,
      }));
      const { queryByTestId } = render(
        <ConnectorFormTestProvider connector={geminiConnector}>
          <GeminiConnectorFields readOnly={false} isEdit registerPreSubmitValidator={() => {}} />
        </ConnectorFormTestProvider>
      );
      expect(queryByTestId('link-gen-ai-token-dashboard')).not.toBeInTheDocument();
    });
    it('Renders if isEdit is true and dashboardUrl is defined', async () => {
      const { getByTestId } = render(
        <ConnectorFormTestProvider connector={geminiConnector}>
          <GeminiConnectorFields readOnly={false} isEdit registerPreSubmitValidator={() => {}} />
        </ConnectorFormTestProvider>
      );
      expect(getByTestId('link-gen-ai-token-dashboard')).toBeInTheDocument();
    });
    it('On click triggers redirect with correct saved object id', async () => {
      const { getByTestId } = render(
        <ConnectorFormTestProvider connector={geminiConnector}>
          <GeminiConnectorFields readOnly={false} isEdit registerPreSubmitValidator={() => {}} />
        </ConnectorFormTestProvider>
      );
      fireEvent.click(getByTestId('link-gen-ai-token-dashboard'));
      expect(navigateToUrl).toHaveBeenCalledWith(`https://dashboardurl.com/123`);
    });
  });

  describe('Validation', () => {
    const onSubmit = jest.fn();

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('validates correctly if the apiUrl is empty', async () => {
      const connector = {
        ...geminiConnector,
        config: {
          ...geminiConnector.config,
          apiUrl: '',
        },
      };

      const res = render(
        <ConnectorFormTestProvider connector={connector} onSubmit={onSubmit}>
          <GeminiConnectorFields
            readOnly={false}
            isEdit={false}
            registerPreSubmitValidator={() => {}}
          />
        </ConnectorFormTestProvider>
      );

      await act(async () => {
        await userEvent.click(res.getByTestId('form-test-provide-submit'));
      });
      await waitFor(async () => {
        expect(onSubmit).toHaveBeenCalled();
      });

      expect(onSubmit).toHaveBeenCalledWith({ data: {}, isValid: false });
    });

    const tests: Array<[string, string]> = [['config.apiUrl-input', 'not-valid']];
    it.each(tests)('validates correctly %p', async (field, value) => {
      const connector = {
        ...geminiConnector,
        config: {
          ...geminiConnector.config,
          headers: [],
        },
      };

      const res = render(
        <ConnectorFormTestProvider connector={connector} onSubmit={onSubmit}>
          <GeminiConnectorFields
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
      await waitFor(async () => {
        expect(onSubmit).toHaveBeenCalled();
      });

      expect(onSubmit).toHaveBeenCalledWith({ data: {}, isValid: false });
    });
  });
});
