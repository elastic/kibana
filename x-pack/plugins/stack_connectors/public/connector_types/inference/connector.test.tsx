/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import ConnectorFields from './connector';
import { ConnectorFormTestProvider } from '../lib/test_utils';
import { render, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createStartServicesMock } from '@kbn/triggers-actions-ui-plugin/public/common/lib/kibana/kibana_react.mock';
import { useProviders } from './providers/get_providers';
import { DisplayType, FieldType } from '../../../common/dynamic_config/types';

jest.mock('./providers/get_providers');

const mockUseKibanaReturnValue = createStartServicesMock();
jest.mock('@kbn/triggers-actions-ui-plugin/public/common/lib/kibana', () => ({
  __esModule: true,
  useKibana: jest.fn(() => ({
    services: mockUseKibanaReturnValue,
  })),
}));

jest.mock('@faker-js/faker', () => {
  const originalModule = jest.requireActual('@faker-js/faker');
  return {
    ...originalModule,
    faker: {
      ...originalModule.faker,
      string: {
        ...originalModule.faker.string,
        alpha: jest.fn().mockReturnValue('123'),
      },
    },
  };
});

const mockProviders = useProviders as jest.Mock;

const providersSchemas = [
  {
    provider: 'openai',
    logo: '', // should be openai logo here, the hardcoded uses assets/images
    task_types: [
      {
        task_type: 'completion',
        configuration: {
          user: {
            display: DisplayType.TEXTBOX,
            label: 'User',
            order: 1,
            required: false,
            sensitive: false,
            tooltip: 'Specifies the user issuing the request.',
            type: FieldType.STRING,
            validations: [],
            value: '',
            ui_restrictions: [],
            default_value: null,
            depends_on: [],
          },
        },
      },
    ],
    configuration: {
      api_key: {
        display: DisplayType.TEXTBOX,
        label: 'API Key',
        order: 3,
        required: true,
        sensitive: true,
        tooltip: `The OpenAI API authentication key. For more details about generating OpenAI API keys, refer to the https://platform.openai.com/account/api-keys.`,
        type: FieldType.STRING,
        validations: [],
        value: null,
        ui_restrictions: [],
        default_value: null,
        depends_on: [],
      },
      model_id: {
        display: DisplayType.TEXTBOX,
        label: 'Model ID',
        order: 2,
        required: true,
        sensitive: false,
        tooltip: 'The name of the model.',
        type: FieldType.STRING,
        validations: [],
        value: null,
        ui_restrictions: [],
        default_value: null,
        depends_on: [],
      },
      organization_id: {
        display: DisplayType.TEXTBOX,
        label: 'Organization ID',
        order: 4,
        required: false,
        sensitive: false,
        tooltip: '',
        type: FieldType.STRING,
        validations: [],
        value: null,
        ui_restrictions: [],
        default_value: null,
        depends_on: [],
      },
      url: {
        display: DisplayType.TEXTBOX,
        label: 'URL',
        order: 1,
        required: true,
        sensitive: false,
        tooltip: '',
        type: FieldType.STRING,
        validations: [],
        value: null,
        ui_restrictions: [],
        default_value: 'https://api.openai.com/v1/chat/completions',
        depends_on: [],
      },
    },
  },
  {
    provider: 'googleaistudio',
    logo: '', // should be googleaistudio logo here, the hardcoded uses assets/images
    task_types: [
      {
        task_type: 'completion',
        configuration: {},
      },
      {
        task_type: 'text_embedding',
        configuration: {},
      },
    ],
    configuration: {
      api_key: {
        display: DisplayType.TEXTBOX,
        label: 'API Key',
        order: 1,
        required: true,
        sensitive: true,
        tooltip: `API Key for the provider you're connecting to`,
        type: FieldType.STRING,
        validations: [],
        value: null,
        ui_restrictions: [],
        default_value: null,
        depends_on: [],
      },
      model_id: {
        display: DisplayType.TEXTBOX,
        label: 'Model ID',
        order: 2,
        required: true,
        sensitive: false,
        tooltip: `ID of the LLM you're using`,
        type: FieldType.STRING,
        validations: [],
        value: null,
        ui_restrictions: [],
        default_value: null,
        depends_on: [],
      },
    },
  },
];

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
      organization_id: 'test-org',
    },
    taskTypeConfig: {
      user: 'elastic',
    },
  },
  secrets: {
    secretsConfig: {
      api_key: 'thats-a-nice-looking-key',
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
      ...openAiConnector.config.providerConfig,
      model_id: 'somemodel',
    },
    taskTypeConfig: {},
  },
  secrets: {
    secretsConfig: {
      api_key: 'thats-google-key',
    },
  },
};

describe('ConnectorFields renders', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockProviders.mockReturnValue({
      isLoading: false,
      data: providersSchemas,
    });
  });
  test('openai provider fields are rendered', async () => {
    const { getAllByTestId } = render(
      <ConnectorFormTestProvider connector={openAiConnector}>
        <ConnectorFields readOnly={false} isEdit={true} registerPreSubmitValidator={() => {}} />
      </ConnectorFormTestProvider>
    );
    expect(getAllByTestId('provider-select')[0]).toBeInTheDocument();
    expect(getAllByTestId('provider-select')[0]).toHaveValue('OpenAI');

    expect(getAllByTestId('url-input')[0]).toBeInTheDocument();
    expect(getAllByTestId('url-input')[0]).toHaveValue(openAiConnector.config?.providerConfig?.url);
    expect(getAllByTestId('taskTypeSelectDisabled')[0]).toBeInTheDocument();
    expect(getAllByTestId('taskTypeSelectDisabled')[0]).toHaveTextContent('completion');
  });

  test('googleaistudio provider fields are rendered', async () => {
    const { getAllByTestId } = render(
      <ConnectorFormTestProvider connector={googleaistudioConnector}>
        <ConnectorFields readOnly={false} isEdit={true} registerPreSubmitValidator={() => {}} />
      </ConnectorFormTestProvider>
    );
    expect(getAllByTestId('api_key-password')[0]).toBeInTheDocument();
    expect(getAllByTestId('api_key-password')[0]).toHaveValue('');
    expect(getAllByTestId('provider-select')[0]).toBeInTheDocument();
    expect(getAllByTestId('provider-select')[0]).toHaveValue('Google AI Studio');
    expect(getAllByTestId('model_id-input')[0]).toBeInTheDocument();
    expect(getAllByTestId('model_id-input')[0]).toHaveValue(
      googleaistudioConnector.config?.providerConfig.model_id
    );
  });

  describe('Validation', () => {
    const onSubmit = jest.fn();

    beforeEach(() => {
      jest.clearAllMocks();
      jest.spyOn(global.Math, 'random').mockReturnValue(0.123456789);
    });

    it('connector validation succeeds when connector config is valid', async () => {
      const { getByTestId } = render(
        <ConnectorFormTestProvider connector={openAiConnector} onSubmit={onSubmit}>
          <ConnectorFields readOnly={false} isEdit={false} registerPreSubmitValidator={() => {}} />
        </ConnectorFormTestProvider>
      );

      await userEvent.click(getByTestId('form-test-provide-submit'));

      await waitFor(async () => {
        expect(onSubmit).toHaveBeenCalled();
      });

      expect(onSubmit).toBeCalledWith({
        data: {
          config: {
            inferenceId: 'openai-completion-4fzzzxjylrx',
            ...openAiConnector.config,
          },
          actionTypeId: openAiConnector.actionTypeId,
          name: openAiConnector.name,
          id: openAiConnector.id,
          isDeprecated: openAiConnector.isDeprecated,
        },
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
          <ConnectorFields readOnly={false} isEdit={true} registerPreSubmitValidator={() => {}} />
        </ConnectorFormTestProvider>
      );

      await userEvent.click(res.getByTestId('form-test-provide-submit'));
      await waitFor(async () => {
        expect(onSubmit).toHaveBeenCalled();
      });

      expect(onSubmit).toHaveBeenCalledWith({ data: {}, isValid: false });
    });

    const tests: Array<[string, string]> = [
      ['url-input', 'not-valid'],
      ['api_key-password', ''],
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
          <ConnectorFields readOnly={false} isEdit={true} registerPreSubmitValidator={() => {}} />
        </ConnectorFormTestProvider>
      );

      await userEvent.type(res.getByTestId(field), `{selectall}{backspace}${value}`, {
        delay: 10,
      });

      await userEvent.click(res.getByTestId('form-test-provide-submit'));
      await waitFor(async () => {
        expect(onSubmit).toHaveBeenCalled();
      });

      expect(onSubmit).toHaveBeenCalledWith({ data: {}, isValid: false });
    });
  });
});
