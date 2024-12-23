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
import { FieldType } from '../../../common/dynamic_config/types';

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
    service: 'cohere',
    name: 'Cohere',
    task_types: ['text_embedding', 'rerank', 'completion'],
    configurations: {
      api_key: {
        default_value: null,
        description: `API Key for the provider you're connecting to.`,
        label: 'API Key',
        required: true,
        sensitive: true,
        updatable: true,
        type: FieldType.STRING,
      },
      'rate_limit.requests_per_minute': {
        default_value: null,
        description: 'Minimize the number of rate limit errors.',
        label: 'Rate Limit',
        required: false,
        sensitive: false,
        updatable: true,
        type: FieldType.INTEGER,
      },
    },
  },
  {
    service: 'elastic',
    name: 'Elastic',
    task_types: ['sparse_embedding'],
    configurations: {
      'rate_limit.requests_per_minute': {
        default_value: null,
        description: 'Minimize the number of rate limit errors.',
        label: 'Rate Limit',
        required: false,
        sensitive: false,
        updatable: true,
        type: FieldType.INTEGER,
      },
      model_id: {
        default_value: null,
        description: 'The name of the model to use for the inference task.',
        label: 'Model ID',
        required: true,
        sensitive: false,
        updatable: true,
        type: FieldType.STRING,
      },
      max_input_tokens: {
        default_value: null,
        description: 'Allows you to specify the maximum number of tokens per input.',
        label: 'Maximum Input Tokens',
        required: false,
        sensitive: false,
        updatable: true,
        type: FieldType.INTEGER,
      },
    },
  },
  {
    service: 'watsonxai',
    name: 'IBM Watsonx',
    task_types: ['text_embedding'],
    configurations: {
      project_id: {
        default_value: null,
        description: '',
        label: 'Project ID',
        required: true,
        sensitive: false,
        updatable: true,
        type: FieldType.STRING,
      },
      model_id: {
        default_value: null,
        description: 'The name of the model to use for the inference task.',
        label: 'Model ID',
        required: true,
        sensitive: false,
        updatable: true,
        type: FieldType.STRING,
      },
      api_version: {
        default_value: null,
        description: 'The IBM Watsonx API version ID to use.',
        label: 'API Version',
        required: true,
        sensitive: false,
        updatable: true,
        type: FieldType.STRING,
      },
      max_input_tokens: {
        default_value: null,
        description: 'Allows you to specify the maximum number of tokens per input.',
        label: 'Maximum Input Tokens',
        required: false,
        sensitive: false,
        updatable: true,
        type: FieldType.INTEGER,
      },
      url: {
        default_value: null,
        description: '',
        label: 'URL',
        required: true,
        sensitive: false,
        updatable: true,
        type: FieldType.STRING,
      },
    },
  },
  {
    service: 'azureaistudio',
    name: 'Azure AI Studio',
    task_types: ['text_embedding', 'completion'],
    configurations: {
      endpoint_type: {
        default_value: null,
        description: 'Specifies the type of endpoint that is used in your model deployment.',
        label: 'Endpoint Type',
        required: true,
        sensitive: false,
        updatable: true,
        type: FieldType.STRING,
      },
      provider: {
        default_value: null,
        description: 'The model provider for your deployment.',
        label: 'Provider',
        required: true,
        sensitive: false,
        updatable: true,
        type: FieldType.STRING,
      },
      api_key: {
        default_value: null,
        description: `API Key for the provider you're connecting to.`,
        label: 'API Key',
        required: true,
        sensitive: true,
        updatable: true,
        type: FieldType.STRING,
      },
      'rate_limit.requests_per_minute': {
        default_value: null,
        description: 'Minimize the number of rate limit errors.',
        label: 'Rate Limit',
        required: false,
        sensitive: false,
        updatable: true,
        type: FieldType.INTEGER,
      },
      target: {
        default_value: null,
        description: 'The target URL of your Azure AI Studio model deployment.',
        label: 'Target',
        required: true,
        sensitive: false,
        updatable: true,
        type: FieldType.STRING,
      },
    },
  },
  {
    service: 'hugging_face',
    name: 'Hugging Face',
    task_types: ['text_embedding', 'sparse_embedding'],
    configurations: {
      api_key: {
        default_value: null,
        description: `API Key for the provider you're connecting to.`,
        label: 'API Key',
        required: true,
        sensitive: true,
        updatable: true,
        type: FieldType.STRING,
      },
      'rate_limit.requests_per_minute': {
        default_value: null,
        description: 'Minimize the number of rate limit errors.',
        label: 'Rate Limit',
        required: false,
        sensitive: false,
        updatable: true,
        type: FieldType.INTEGER,
      },
      url: {
        default_value: 'https://api.openai.com/v1/embeddings',
        description: 'The URL endpoint to use for the requests.',
        label: 'URL',
        required: true,
        sensitive: false,
        updatable: true,
        type: FieldType.STRING,
      },
    },
  },
  {
    service: 'amazonbedrock',
    name: 'Amazon Bedrock',
    task_types: ['text_embedding', 'completion'],
    configurations: {
      secret_key: {
        default_value: null,
        description: 'A valid AWS secret key that is paired with the access_key.',
        label: 'Secret Key',
        required: true,
        sensitive: true,
        updatable: true,
        type: FieldType.STRING,
      },
      provider: {
        default_value: null,
        description: 'The model provider for your deployment.',
        label: 'Provider',
        required: true,
        sensitive: false,
        updatable: true,
        type: FieldType.STRING,
      },
      access_key: {
        default_value: null,
        description: 'A valid AWS access key that has permissions to use Amazon Bedrock.',
        label: 'Access Key',
        required: true,
        sensitive: true,
        updatable: true,
        type: FieldType.STRING,
      },
      model: {
        default_value: null,
        description: 'The base model ID or an ARN to a custom model based on a foundational model.',
        label: 'Model',
        required: true,
        sensitive: false,
        updatable: true,
        type: FieldType.STRING,
      },
      'rate_limit.requests_per_minute': {
        default_value: null,
        description:
          'By default, the amazonbedrock service sets the number of requests allowed per minute to 240.',
        label: 'Rate Limit',
        required: false,
        sensitive: false,
        updatable: true,
        type: FieldType.INTEGER,
      },
      region: {
        default_value: null,
        description: 'The region that your model or ARN is deployed in.',
        label: 'Region',
        required: true,
        sensitive: false,
        updatable: true,
        type: FieldType.STRING,
      },
    },
  },
  {
    service: 'anthropic',
    name: 'Anthropic',
    task_types: ['completion'],
    configurations: {
      api_key: {
        default_value: null,
        description: `API Key for the provider you're connecting to.`,
        label: 'API Key',
        required: true,
        sensitive: true,
        updatable: true,
        type: FieldType.STRING,
      },
      'rate_limit.requests_per_minute': {
        default_value: null,
        description:
          'By default, the anthropic service sets the number of requests allowed per minute to 50.',
        label: 'Rate Limit',
        required: false,
        sensitive: false,
        updatable: true,
        type: FieldType.INTEGER,
      },
      model_id: {
        default_value: null,
        description: 'The name of the model to use for the inference task.',
        label: 'Model ID',
        required: true,
        sensitive: false,
        updatable: true,
        type: FieldType.STRING,
      },
    },
  },
  {
    service: 'googleaistudio',
    name: 'Google AI Studio',
    task_types: ['text_embedding', 'completion'],
    configurations: {
      api_key: {
        default_value: null,
        description: `API Key for the provider you're connecting to.`,
        label: 'API Key',
        required: true,
        sensitive: true,
        updatable: true,
        type: FieldType.STRING,
      },
      'rate_limit.requests_per_minute': {
        default_value: null,
        description: 'Minimize the number of rate limit errors.',
        label: 'Rate Limit',
        required: false,
        sensitive: false,
        updatable: true,
        type: FieldType.INTEGER,
      },
      model_id: {
        default_value: null,
        description: "ID of the LLM you're using.",
        label: 'Model ID',
        required: true,
        sensitive: false,
        updatable: true,
        type: FieldType.STRING,
      },
    },
  },
  {
    service: 'elasticsearch',
    name: 'Elasticsearch',
    task_types: ['text_embedding', 'sparse_embedding', 'rerank'],
    configurations: {
      num_allocations: {
        default_value: 1,
        description:
          'The total number of allocations this model is assigned across machine learning nodes.',
        label: 'Number Allocations',
        required: true,
        sensitive: false,
        updatable: true,
        type: FieldType.INTEGER,
      },
      num_threads: {
        default_value: 2,
        description: 'Sets the number of threads used by each model allocation during inference.',
        label: 'Number Threads',
        required: true,
        sensitive: false,
        updatable: true,
        type: FieldType.INTEGER,
      },
      model_id: {
        default_value: '.multilingual-e5-small',
        description: 'The name of the model to use for the inference task.',
        label: 'Model ID',
        required: true,
        sensitive: false,
        updatable: true,
        type: FieldType.STRING,
      },
    },
  },
  {
    service: 'openai',
    name: 'OpenAI',
    task_types: ['text_embedding', 'completion'],
    configurations: {
      api_key: {
        default_value: null,
        description:
          'The OpenAI API authentication key. For more details about generating OpenAI API keys, refer to the https://platform.openai.com/account/api-keys.',
        label: 'API Key',
        required: true,
        sensitive: true,
        updatable: true,
        type: FieldType.STRING,
      },
      organization_id: {
        default_value: null,
        description: 'The unique identifier of your organization.',
        label: 'Organization ID',
        required: false,
        sensitive: false,
        updatable: true,
        type: FieldType.STRING,
      },
      'rate_limit.requests_per_minute': {
        default_value: null,
        description:
          'Default number of requests allowed per minute. For text_embedding is 3000. For completion is 500.',
        label: 'Rate Limit',
        required: false,
        sensitive: false,
        updatable: true,
        type: FieldType.INTEGER,
      },
      model_id: {
        default_value: null,
        description: 'The name of the model to use for the inference task.',
        label: 'Model ID',
        required: true,
        sensitive: false,
        updatable: true,
        type: FieldType.STRING,
      },
      url: {
        default_value: 'https://api.openai.com/v1/chat/completions',
        description:
          'The OpenAI API endpoint URL. For more information on the URL, refer to the https://platform.openai.com/docs/api-reference.',
        label: 'URL',
        required: true,
        sensitive: false,
        updatable: true,
        type: FieldType.STRING,
      },
    },
  },
  {
    service: 'azureopenai',
    name: 'Azure OpenAI',
    task_types: ['text_embedding', 'completion'],
    configurations: {
      api_key: {
        default_value: null,
        description: `API Key for the provider you're connecting to.`,
        label: 'API Key',
        required: true,
        sensitive: true,
        updatable: true,
        type: FieldType.STRING,
      },
      entra_id: {
        default_value: null,
        description: 'You must provide either an API key or an Entra ID.',
        label: 'Entra ID',
        required: false,
        sensitive: true,
        updatable: true,
        type: FieldType.STRING,
      },
      'rate_limit.requests_per_minute': {
        default_value: null,
        description:
          'The azureopenai service sets a default number of requests allowed per minute depending on the task type.',
        label: 'Rate Limit',
        required: false,
        sensitive: false,
        updatable: true,
        type: FieldType.INTEGER,
      },
      deployment_id: {
        default_value: null,
        description: 'The deployment name of your deployed models.',
        label: 'Deployment ID',
        required: true,
        sensitive: false,
        updatable: true,
        type: FieldType.STRING,
      },
      resource_name: {
        default_value: null,
        description: 'The name of your Azure OpenAI resource.',
        label: 'Resource Name',
        required: true,
        sensitive: false,
        updatable: true,
        type: FieldType.STRING,
      },
      api_version: {
        default_value: null,
        description: 'The Azure API version ID to use.',
        label: 'API Version',
        required: true,
        sensitive: false,
        updatable: true,
        type: FieldType.STRING,
      },
    },
  },
  {
    service: 'mistral',
    name: 'Mistral',
    task_types: ['text_embedding'],
    configurations: {
      api_key: {
        default_value: null,
        description: `API Key for the provider you're connecting to.`,
        label: 'API Key',
        required: true,
        sensitive: true,
        updatable: true,
        type: FieldType.STRING,
      },
      model: {
        default_value: null,
        description:
          'Refer to the Mistral models documentation for the list of available text embedding models.',
        label: 'Model',
        required: true,
        sensitive: false,
        updatable: true,
        type: FieldType.STRING,
      },
      'rate_limit.requests_per_minute': {
        default_value: null,
        description: 'Minimize the number of rate limit errors.',
        label: 'Rate Limit',
        required: false,
        sensitive: false,
        updatable: true,
        type: FieldType.INTEGER,
      },
      max_input_tokens: {
        default_value: null,
        description: 'Allows you to specify the maximum number of tokens per input.',
        label: 'Maximum Input Tokens',
        required: false,
        sensitive: false,
        updatable: true,
        type: FieldType.INTEGER,
      },
    },
  },
  {
    service: 'googlevertexai',
    name: 'Google Vertex AI',
    task_types: ['text_embedding', 'rerank'],
    configurations: {
      service_account_json: {
        default_value: null,
        description: "API Key for the provider you're connecting to.",
        label: 'Credentials JSON',
        required: true,
        sensitive: true,
        updatable: true,
        type: FieldType.STRING,
      },
      project_id: {
        default_value: null,
        description:
          'The GCP Project ID which has Vertex AI API(s) enabled. For more information on the URL, refer to the {geminiVertexAIDocs}.',
        label: 'GCP Project',
        required: true,
        sensitive: false,
        updatable: true,
        type: FieldType.STRING,
      },
      location: {
        default_value: null,
        description:
          'Please provide the GCP region where the Vertex AI API(s) is enabled. For more information, refer to the {geminiVertexAIDocs}.',
        label: 'GCP Region',
        required: true,
        sensitive: false,
        updatable: true,
        type: FieldType.STRING,
      },
      'rate_limit.requests_per_minute': {
        default_value: null,
        description: 'Minimize the number of rate limit errors.',
        label: 'Rate Limit',
        required: false,
        sensitive: false,
        updatable: true,
        type: FieldType.INTEGER,
      },
      model_id: {
        default_value: null,
        description: `ID of the LLM you're using.`,
        label: 'Model ID',
        required: true,
        sensitive: false,
        updatable: true,
        type: FieldType.STRING,
      },
    },
  },
  {
    service: 'alibabacloud-ai-search',
    name: 'AlibabaCloud AI Search',
    task_types: ['text_embedding', 'sparse_embedding', 'rerank', 'completion'],
    configurations: {
      workspace: {
        default_value: null,
        description: 'The name of the workspace used for the {infer} task.',
        label: 'Workspace',
        required: true,
        sensitive: false,
        updatable: true,
        type: FieldType.STRING,
      },
      api_key: {
        default_value: null,
        description: `A valid API key for the AlibabaCloud AI Search API.`,
        label: 'API Key',
        required: true,
        sensitive: true,
        updatable: true,
        type: FieldType.STRING,
      },
      service_id: {
        default_value: null,
        description: 'The name of the model service to use for the {infer} task.',
        label: 'Project ID',
        required: true,
        sensitive: false,
        updatable: true,
        type: FieldType.STRING,
      },
      host: {
        default_value: null,
        description:
          'The name of the host address used for the {infer} task. You can find the host address at https://opensearch.console.aliyun.com/cn-shanghai/rag/api-key[ the API keys section] of the documentation.',
        label: 'Host',
        required: true,
        sensitive: false,
        updatable: true,
        type: FieldType.STRING,
      },
      'rate_limit.requests_per_minute': {
        default_value: null,
        description: 'Minimize the number of rate limit errors.',
        label: 'Rate Limit',
        required: false,
        sensitive: false,
        updatable: true,
        type: FieldType.INTEGER,
      },
      http_schema: {
        default_value: null,
        description: '',
        label: 'HTTP Schema',
        required: true,
        sensitive: false,
        updatable: true,
        type: FieldType.STRING,
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
            model_id: 'gpt-4o',
          },
        },
      };

      const res = render(
        <ConnectorFormTestProvider connector={connector} onSubmit={onSubmit}>
          <ConnectorFields readOnly={false} isEdit={true} registerPreSubmitValidator={() => {}} />
        </ConnectorFormTestProvider>
      );
      await userEvent.type(
        res.getByTestId('api_key-password'),
        '{selectall}{backspace}goodpassword'
      );

      await userEvent.click(res.getByTestId('form-test-provide-submit'));
      await waitFor(async () => {
        expect(onSubmit).toHaveBeenCalled();
      });

      expect(onSubmit).toHaveBeenCalledWith({ data: {}, isValid: false });
    });

    const tests: Array<[string, string]> = [
      ['url-input', ''],
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

      await userEvent.type(res.getByTestId(field), `{selectall}{backspace}${value}`);

      await userEvent.click(res.getByTestId('form-test-provide-submit'));
      await waitFor(async () => {
        expect(onSubmit).toHaveBeenCalled();
      });

      expect(onSubmit).toHaveBeenCalledWith({ data: {}, isValid: false });
    });
  });
});
