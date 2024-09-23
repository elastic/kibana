/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen } from '@testing-library/react';
import React from 'react';
import { ServiceProvider } from './service_provider';

jest.mock('@kbn/ml-trained-models-utils', () => ({
  ...jest.requireActual('@kbn/ml-trained-models-utils'),
  ELASTIC_MODEL_DEFINITIONS: {
    'model-with-mit-license': {
      license: 'MIT',
      licenseUrl: 'https://abc.com',
    },
  },
}));

describe('ServiceProvider component', () => {
  describe('with HuggingFace service', () => {
    const mockEndpoint = {
      inference_id: 'my-hugging-face',
      service: 'hugging_face',
      service_settings: {
        api_key: 'aaaa',
        url: 'https://dummy.huggingface.com',
      },
      task_settings: {},
    } as any;
    it('renders the component with service and model details', () => {
      render(<ServiceProvider providerEndpoint={mockEndpoint} />);

      expect(screen.getByText('Hugging Face')).toBeInTheDocument();
      const icon = screen.getByTestId('table-column-service-provider-hugging_face');
      expect(icon).toBeInTheDocument();
      expect(screen.getByText('https://dummy.huggingface.com')).toBeInTheDocument();
    });
  });

  describe('with openai service', () => {
    const mockEndpoint = {
      inference_id: 'my-openai-endpoint',
      service: 'openai',
      service_settings: {
        api_key: 'aaaa',
        model_id: 'text-embedding-3-small',
      },
      task_settings: {},
    } as any;
    it('renders the component with service and model details', () => {
      render(<ServiceProvider providerEndpoint={mockEndpoint} />);

      expect(screen.getByText('OpenAI')).toBeInTheDocument();
      const icon = screen.getByTestId('table-column-service-provider-openai');
      expect(icon).toBeInTheDocument();
      expect(screen.getByText('text-embedding-3-small')).toBeInTheDocument();
    });
  });

  describe('with cohere service', () => {
    const mockEndpoint = {
      inference_id: 'cohere-2',
      service: 'cohere',
      service_settings: {
        similarity: 'cosine',
        dimensions: 384,
        model_id: 'embed-english-light-v3.0',
        rate_limit: {
          requests_per_minute: 10000,
        },
        embedding_type: 'byte',
      },
      task_settings: {},
    } as any;

    it('renders the component with service and model details', () => {
      render(<ServiceProvider providerEndpoint={mockEndpoint} />);

      expect(screen.getByText('Cohere')).toBeInTheDocument();
      const icon = screen.getByTestId('table-column-service-provider-cohere');
      expect(icon).toBeInTheDocument();
      expect(screen.getByText('embed-english-light-v3.0')).toBeInTheDocument();
    });

    it('does not render model_id badge if serviceSettings.model_id is not provided', () => {
      const modifiedEndpoint = {
        ...mockEndpoint,
        service_settings: { ...mockEndpoint.service_settings, model_id: undefined },
      };
      render(<ServiceProvider providerEndpoint={modifiedEndpoint} />);

      expect(screen.queryByText('embed-english-light-v3.0')).not.toBeInTheDocument();
    });
  });

  describe('with azureaistudio service', () => {
    const mockEndpoint = {
      inference_id: 'azure-ai-1',
      service: 'azureaistudio',
      service_settings: {
        target: 'westus',
        provider: 'microsoft_phi',
        endpoint_type: 'realtime',
      },
    } as any;

    it('renders the component with endpoint details', () => {
      render(<ServiceProvider providerEndpoint={mockEndpoint} />);

      expect(screen.getByText('Azure AI Studio')).toBeInTheDocument();
      const icon = screen.getByTestId('table-column-service-provider-azureaistudio');
      expect(icon).toBeInTheDocument();
      expect(screen.getByText('microsoft_phi')).toBeInTheDocument();
    });

    it('renders nothing related to service settings when all are missing', () => {
      const modifiedEndpoint = {
        ...mockEndpoint,
        service_settings: {},
      };
      render(<ServiceProvider providerEndpoint={modifiedEndpoint} />);

      expect(screen.getByText('Azure AI Studio')).toBeInTheDocument();
      const icon = screen.getByTestId('table-column-service-provider-azureaistudio');
      expect(icon).toBeInTheDocument();
      expect(screen.queryByText('microsoft_phi')).not.toBeInTheDocument();
    });
  });

  describe('with azureopenai service', () => {
    const mockEndpoint = {
      inference_id: 'azure-openai-1',
      service: 'azureopenai',
      service_settings: {
        resource_name: 'resource-xyz',
        deployment_id: 'deployment-123',
        api_version: 'v1',
      },
    } as any;

    it('renders the component with all required endpoint details', () => {
      render(<ServiceProvider providerEndpoint={mockEndpoint} />);

      expect(screen.getByText('Azure OpenAI')).toBeInTheDocument();
      const icon = screen.getByTestId('table-column-service-provider-azureopenai');
      expect(icon).toBeInTheDocument();
      expect(screen.getByText('resource-xyz')).toBeInTheDocument();
    });
  });

  describe('with mistral service', () => {
    const mockEndpoint = {
      inference_id: 'mistral-ai-1',
      service: 'mistral',
      service_settings: {
        model: 'model-xyz',
        max_input_tokens: 512,
        rate_limit: {
          requests_per_minute: 1000,
        },
      },
    } as any;

    it('renders the component with endpoint details', () => {
      render(<ServiceProvider providerEndpoint={mockEndpoint} />);

      expect(screen.getByText('Mistral')).toBeInTheDocument();
      const icon = screen.getByTestId('table-column-service-provider-mistral');
      expect(icon).toBeInTheDocument();
      expect(screen.getByText('model-xyz')).toBeInTheDocument();
    });

    it('does not render model id if not provided', () => {
      const modifiedEndpoint = {
        ...mockEndpoint,
        service_settings: {},
      };
      render(<ServiceProvider providerEndpoint={modifiedEndpoint} />);

      const icon = screen.getByTestId('table-column-service-provider-mistral');
      expect(icon).toBeInTheDocument();
      expect(screen.getByText('Mistral')).toBeInTheDocument();
      expect(screen.queryByText('model-xyz')).not.toBeInTheDocument();
    });
  });

  describe('with elasticsearch service', () => {
    const mockEndpoint = {
      inference_id: 'model-123',
      service: 'elasticsearch',
      service_settings: {
        num_allocations: 5,
        num_threads: 10,
        model_id: 'settings-model-123',
      },
    } as any;

    it('renders the component with endpoint model_id', () => {
      render(<ServiceProvider providerEndpoint={mockEndpoint} />);

      expect(screen.getByText('Elasticsearch')).toBeInTheDocument();
      const icon = screen.getByTestId('table-column-service-provider-elasticsearch');
      expect(icon).toBeInTheDocument();
      expect(screen.getByText('settings-model-123')).toBeInTheDocument();
    });

    it('renders the MIT license badge if the model is eligible', () => {
      const modifiedEndpoint = {
        ...mockEndpoint,
        service_settings: { ...mockEndpoint.service_settings, model_id: 'model-with-mit-license' },
      };
      render(<ServiceProvider providerEndpoint={modifiedEndpoint} />);

      const mitBadge = screen.getByTestId('mit-license-badge');
      expect(mitBadge).toBeInTheDocument();
      expect(mitBadge).toHaveAttribute('href', 'https://abc.com');
    });

    it('does not render the MIT license badge if the model is not eligible', () => {
      render(<ServiceProvider providerEndpoint={mockEndpoint} />);

      expect(screen.queryByTestId('mit-license-badge')).not.toBeInTheDocument();
    });
  });

  describe('with googleaistudio service', () => {
    const mockEndpoint = {
      inference_id: 'google-ai-1',
      service: 'googleaistudio',
      service_settings: {
        model_id: 'model-abc',
        rate_limit: {
          requests_per_minute: 500,
        },
      },
    } as any;

    it('renders the component with service and model details', () => {
      render(<ServiceProvider providerEndpoint={mockEndpoint} />);

      expect(screen.getByText('Google AI Studio')).toBeInTheDocument();
      const icon = screen.getByTestId('table-column-service-provider-googleaistudio');
      expect(icon).toBeInTheDocument();
      expect(screen.getByText('model-abc')).toBeInTheDocument();
    });
  });

  describe('with amazonbedrock service', () => {
    const mockEndpoint = {
      inference_id: 'amazon-bedrock-1',
      service: 'amazonbedrock',
      service_settings: {
        region: 'us-west-1',
        provider: 'AMAZONTITAN',
        model: 'model-bedrock-xyz',
      },
    } as any;

    it('renders the component with model and service details', () => {
      render(<ServiceProvider providerEndpoint={mockEndpoint} />);

      expect(screen.getByText('Amazon Bedrock')).toBeInTheDocument();
      const icon = screen.getByTestId('table-column-service-provider-amazonbedrock');
      expect(icon).toBeInTheDocument();
      expect(screen.getByText('model-bedrock-xyz')).toBeInTheDocument();
    });
  });
});
