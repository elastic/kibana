/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import ConnectorFields from './connector';
import { ConnectorFormTestProvider } from '../lib/test_utils';
import { act, fireEvent, render, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useKibana } from '@kbn/triggers-actions-ui-plugin/public';
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
const openAiConnector = {
  actionTypeId: '.inference',
  name: 'AI Connector',
  id: '123',
  config: {
    provider: 'openai',
    taskType: 'completion',
    providerConfig: {
      url: 'https://openaiurl.com',
      model_id: 'gpt-4o',
    },
    taskTypeConfig: {},
    providerSchema: [],
    taskTypeSchema: [],
  },
  secrets: {
    secretsConfig: {
      apiKey: 'thats-a-nice-looking-key',
    },
  },
  isDeprecated: false,
};

const googleaistudioConnector = {
  ...openAiConnector,
  config: {
    ...openAiConnector.config,
    provider: 'googleaistudio',
    providerConfig: {
      modelId: 'somemodel',
    },
  },
};

const navigateToUrl = jest.fn();

describe('ConnectorFields renders', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useKibanaMock().services.application.navigateToUrl = navigateToUrl;
    mockDashboard.mockImplementation(({ connectorId }) => ({
      dashboardUrl: `https://dashboardurl.com/${connectorId}`,
    }));
  });
  test('open ai provider fields are rendered', async () => {
    const { getAllByTestId } = render(
      <ConnectorFormTestProvider connector={openAiConnector}>
        <ConnectorFields readOnly={false} isEdit={false} registerPreSubmitValidator={() => {}} />
      </ConnectorFormTestProvider>
    );
    expect(getAllByTestId('config.apiUrl-input')[0]).toBeInTheDocument();
    expect(getAllByTestId('config.apiUrl-input')[0]).toHaveValue(
      openAiConnector.config?.providerConfig?.url
    );
    expect(getAllByTestId('config.apiProvider-select')[0]).toBeInTheDocument();
    expect(getAllByTestId('config.apiProvider-select')[0]).toHaveValue(
      openAiConnector.config.provider
    );
    expect(getAllByTestId('open-ai-api-doc')[0]).toBeInTheDocument();
    expect(getAllByTestId('open-ai-api-keys-doc')[0]).toBeInTheDocument();
  });

  test('azure ai provider fields are rendered', async () => {
    const { getAllByTestId } = render(
      <ConnectorFormTestProvider connector={googleaistudioConnector}>
        <ConnectorFields readOnly={false} isEdit={false} registerPreSubmitValidator={() => {}} />
      </ConnectorFormTestProvider>
    );
    expect(getAllByTestId('config.apiUrl-input')[0]).toBeInTheDocument();
    expect(getAllByTestId('config.apiUrl-input')[0]).toHaveValue(
      googleaistudioConnector.config?.providerConfig?.modelId
    );
    expect(getAllByTestId('config.apiProvider-select')[0]).toBeInTheDocument();
    expect(getAllByTestId('config.apiProvider-select')[0]).toHaveValue(
      googleaistudioConnector.config.provider
    );
    expect(getAllByTestId('azure-ai-api-doc')[0]).toBeInTheDocument();
    expect(getAllByTestId('azure-ai-api-keys-doc')[0]).toBeInTheDocument();
  });

  describe('Dashboard link', () => {
    it('Does not render if isEdit is false and dashboardUrl is defined', async () => {
      const { queryByTestId } = render(
        <ConnectorFormTestProvider connector={openAiConnector}>
          <ConnectorFields readOnly={false} isEdit={false} registerPreSubmitValidator={() => {}} />
        </ConnectorFormTestProvider>
      );
      expect(queryByTestId('link-gen-ai-token-dashboard')).not.toBeInTheDocument();
    });
    it('Does not render if isEdit is true and dashboardUrl is null', async () => {
      mockDashboard.mockImplementation((id: string) => ({
        dashboardUrl: null,
      }));
      const { queryByTestId } = render(
        <ConnectorFormTestProvider connector={openAiConnector}>
          <ConnectorFields readOnly={false} isEdit registerPreSubmitValidator={() => {}} />
        </ConnectorFormTestProvider>
      );
      expect(queryByTestId('link-gen-ai-token-dashboard')).not.toBeInTheDocument();
    });
    it('Renders if isEdit is true and dashboardUrl is defined', async () => {
      const { getByTestId } = render(
        <ConnectorFormTestProvider connector={openAiConnector}>
          <ConnectorFields readOnly={false} isEdit={true} registerPreSubmitValidator={() => {}} />
        </ConnectorFormTestProvider>
      );
      expect(getByTestId('link-gen-ai-token-dashboard')).toBeInTheDocument();
    });
    it('On click triggers redirect with correct saved object id', async () => {
      const { getByTestId } = render(
        <ConnectorFormTestProvider connector={openAiConnector}>
          <ConnectorFields readOnly={false} isEdit={true} registerPreSubmitValidator={() => {}} />
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

    it('connector validation succeeds when connector config is valid', async () => {
      const { getByTestId } = render(
        <ConnectorFormTestProvider connector={openAiConnector} onSubmit={onSubmit}>
          <ConnectorFields readOnly={false} isEdit={false} registerPreSubmitValidator={() => {}} />
        </ConnectorFormTestProvider>
      );

      await act(async () => {
        userEvent.click(getByTestId('form-test-provide-submit'));
      });

      await waitFor(async () => {
        expect(onSubmit).toHaveBeenCalled();
      });

      expect(onSubmit).toBeCalledWith({
        data: openAiConnector,
        isValid: true,
      });
    });

    it('validates correctly if the provider config url is empty', async () => {
      const connector = {
        ...openAiConnector,
        config: {
          ...openAiConnector.config,
          providerConfig: {
            url: '',
            modelId: 'gpt-4o',
          },
        },
      };

      const res = render(
        <ConnectorFormTestProvider connector={connector} onSubmit={onSubmit}>
          <ConnectorFields readOnly={false} isEdit={false} registerPreSubmitValidator={() => {}} />
        </ConnectorFormTestProvider>
      );

      await act(async () => {
        userEvent.click(res.getByTestId('form-test-provide-submit'));
      });
      await waitFor(async () => {
        expect(onSubmit).toHaveBeenCalled();
      });

      expect(onSubmit).toHaveBeenCalledWith({ data: {}, isValid: false });
    });

    const tests: Array<[string, string]> = [
      ['config.apiUrl-input', 'not-valid'],
      ['secrets.apiKey-input', ''],
    ];
    it.each(tests)('validates correctly %p', async (field, value) => {
      const connector = {
        ...openAiConnector,
        config: {
          ...openAiConnector.config,
          headers: [],
        },
      };

      const res = render(
        <ConnectorFormTestProvider connector={connector} onSubmit={onSubmit}>
          <ConnectorFields readOnly={false} isEdit={false} registerPreSubmitValidator={() => {}} />
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
      await waitFor(async () => {
        expect(onSubmit).toHaveBeenCalled();
      });

      expect(onSubmit).toHaveBeenCalledWith({ data: {}, isValid: false });
    });
  });
});
