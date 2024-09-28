/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import ConnectorFields from './connector';
import { ConnectorFormTestProvider } from '../lib/test_utils';
import { act, render, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useKibana } from '@kbn/triggers-actions-ui-plugin/public';
import { createStartServicesMock } from '@kbn/triggers-actions-ui-plugin/public/common/lib/kibana/kibana_react.mock';
import { DisplayType, FieldType } from '../lib/dynamic_config/types';

const mockUseKibanaReturnValue = createStartServicesMock();
jest.mock('@kbn/triggers-actions-ui-plugin/public/common/lib/kibana', () => ({
  __esModule: true,
  useKibana: jest.fn(() => ({
    services: mockUseKibanaReturnValue,
  })),
}));

const useKibanaMock = useKibana as jest.Mocked<typeof useKibana>;
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
    taskTypeConfig: {
      max_tokens: 100,
    },
    providerSchema: [
      {
        key: 'access_key',
        display: DisplayType.TEXTBOX,
        label: 'Access Key',
        order: 1,
        required: true,
        sensitive: true,
        tooltip: `A valid AWS access key that has permissions to use Amazon Bedrock.`,
        type: FieldType.STRING,
        validations: [],
        value: null,
        ui_restrictions: [],
        default_value: null,
        depends_on: [],
      },
    ],
    taskTypeSchema: [
      {
        key: 'max_tokens',
        display: DisplayType.NUMERIC,
        label: 'Max tokens',
        order: 1,
        required: true,
        sensitive: false,
        tooltip: 'The maximum number of tokens to generate before stopping.',
        type: FieldType.INTEGER,
        validations: [],
        value: null,
        ui_restrictions: [],
        default_value: null,
        depends_on: [],
      },
    ],
  },
  secrets: {
    secretsConfig: {
      access_key: 'thats-a-nice-looking-key',
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
  });
  test('open ai provider fields are rendered', async () => {
    const { getAllByTestId } = render(
      <ConnectorFormTestProvider connector={openAiConnector}>
        <ConnectorFields readOnly={false} isEdit={false} registerPreSubmitValidator={() => {}} />
      </ConnectorFormTestProvider>
    );
    expect(getAllByTestId('access_key-input')[0]).toBeInTheDocument();
    expect(getAllByTestId('access_key-input')[0]).toHaveValue(
      openAiConnector.config?.providerConfig?.url
    );
    expect(getAllByTestId('config.apiProvider-select')[0]).toBeInTheDocument();
    expect(getAllByTestId('config.apiProvider-select')[0]).toHaveValue(
      openAiConnector.config.provider
    );
    expect(getAllByTestId('max_tokens-number')[0]).toBeInTheDocument();
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
