/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen } from '@testing-library/react';
import React from 'react';
import { EndpointInfo } from './endpoint_info';

jest.mock('@kbn/ml-trained-models-utils', () => ({
  ...jest.requireActual('@kbn/ml-trained-models-utils'),
  ELASTIC_MODEL_DEFINITIONS: {
    'model-with-mit-license': {
      license: 'MIT',
      licenseUrl: 'https://abc.com',
    },
  },
}));

describe('RenderEndpoint component tests', () => {
  describe('with cohere service', () => {
    const mockEndpoint = {
      model_id: 'cohere-2',
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

    it('renders the component with endpoint details for Cohere service', () => {
      render(<EndpointInfo endpoint={mockEndpoint} />);

      expect(screen.getByText('cohere-2')).toBeInTheDocument();
      expect(screen.getByText('byte')).toBeInTheDocument();
      expect(screen.getByText('embed-english-light-v3.0')).toBeInTheDocument();
    });

    it('does not render model_id badge if serviceSettings.model_id is not provided for Cohere service', () => {
      const modifiedEndpoint = {
        ...mockEndpoint,
        service_settings: { ...mockEndpoint.service_settings, model_id: undefined },
      };
      render(<EndpointInfo endpoint={modifiedEndpoint} />);

      expect(screen.queryByText('embed-english-light-v3.0')).not.toBeInTheDocument();
    });

    it('renders only model_id if other settings are not provided for Cohere service', () => {
      const modifiedEndpoint = {
        ...mockEndpoint,
        service_settings: { model_id: 'embed-english-light-v3.0' },
      };
      render(<EndpointInfo endpoint={modifiedEndpoint} />);

      expect(screen.getByText('embed-english-light-v3.0')).toBeInTheDocument();
      expect(screen.queryByText(',')).not.toBeInTheDocument();
    });
  });

  describe('with elasticsearch service', () => {
    const mockEndpoint = {
      model_id: 'model-123',
      service: 'elasticsearch',
      service_settings: {
        num_allocations: 5,
        num_threads: 10,
        model_id: 'settings-model-123',
      },
    } as any;

    it('renders the component with endpoint model_id and model settings', () => {
      render(<EndpointInfo endpoint={mockEndpoint} />);

      expect(screen.getByText('model-123')).toBeInTheDocument();
      expect(screen.getByText('settings-model-123')).toBeInTheDocument();
      expect(screen.getByText('Threads: 10 | Allocations: 5')).toBeInTheDocument();
    });

    it('renders the component with only model_id if num_threads and num_allocations are not provided', () => {
      const modifiedSettings = {
        ...mockEndpoint.service_settings,
        num_threads: undefined,
        num_allocations: undefined,
      };
      const modifiedEndpoint = { ...mockEndpoint, service_settings: modifiedSettings };
      render(<EndpointInfo endpoint={modifiedEndpoint} />);

      expect(screen.getByText('model-123')).toBeInTheDocument();
      expect(screen.getByText('settings-model-123')).toBeInTheDocument();
      expect(screen.queryByText('Threads: 10 | Allocations: 5')).not.toBeInTheDocument();
    });
  });

  describe('with azureaistudio service', () => {
    const mockEndpoint = {
      model_id: 'azure-ai-1',
      service: 'azureaistudio',
      service_settings: {
        target: 'westus',
        provider: 'microsoft_phi',
        endpoint_type: 'realtime',
      },
    } as any;

    it('renders the component with endpoint details', () => {
      render(<EndpointInfo endpoint={mockEndpoint} />);

      expect(screen.getByText('azure-ai-1')).toBeInTheDocument();
      expect(screen.getByText('microsoft_phi, realtime, westus')).toBeInTheDocument();
    });

    it('renders correctly when some service settings are missing', () => {
      const modifiedEndpoint = {
        ...mockEndpoint,
        service_settings: { target: 'westus', provider: 'microsoft_phi' },
      };
      render(<EndpointInfo endpoint={modifiedEndpoint} />);

      expect(screen.getByText('microsoft_phi, westus')).toBeInTheDocument();
    });

    it('does not render a comma when only one service setting is provided', () => {
      const modifiedEndpoint = {
        ...mockEndpoint,
        service_settings: { target: 'westus' },
      };
      render(<EndpointInfo endpoint={modifiedEndpoint} />);

      expect(screen.getByText('westus')).toBeInTheDocument();
      expect(screen.queryByText(',')).not.toBeInTheDocument();
    });

    it('renders nothing related to service settings when all are missing', () => {
      const modifiedEndpoint = {
        ...mockEndpoint,
        service_settings: {},
      };
      render(<EndpointInfo endpoint={modifiedEndpoint} />);

      expect(screen.getByText('azure-ai-1')).toBeInTheDocument();
      expect(screen.queryByText('westus')).not.toBeInTheDocument();
      expect(screen.queryByText('microsoft_phi')).not.toBeInTheDocument();
      expect(screen.queryByText('realtime')).not.toBeInTheDocument();
    });
  });

  describe('with azureopenai service', () => {
    const mockEndpoint = {
      model_id: 'azure-openai-1',
      service: 'azureopenai',
      service_settings: {
        resource_name: 'resource-xyz',
        deployment_id: 'deployment-123',
        api_version: 'v1',
      },
    } as any;

    it('renders the component with all required endpoint details', () => {
      render(<EndpointInfo endpoint={mockEndpoint} />);

      expect(screen.getByText('azure-openai-1')).toBeInTheDocument();
      expect(screen.getByText('resource-xyz, deployment-123, v1')).toBeInTheDocument();
    });
  });

  describe('with mistral service', () => {
    const mockEndpoint = {
      model_id: 'mistral-ai-1',
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
      render(<EndpointInfo endpoint={mockEndpoint} />);

      expect(screen.getByText('mistral-ai-1')).toBeInTheDocument();
      expect(screen.getByText('model-xyz')).toBeInTheDocument();
      expect(screen.getByText('max_input_tokens: 512, rate_limit: 1000')).toBeInTheDocument();
    });

    it('renders correctly when some service settings are missing', () => {
      const modifiedEndpoint = {
        ...mockEndpoint,
        service_settings: {
          model: 'model-xyz',
          max_input_tokens: 512,
        },
      };
      render(<EndpointInfo endpoint={modifiedEndpoint} />);

      expect(screen.getByText('max_input_tokens: 512')).toBeInTheDocument();
    });

    it('does not render a comma when only one service setting is provided', () => {
      const modifiedEndpoint = {
        ...mockEndpoint,
        service_settings: { model: 'model-xyz' },
      };
      render(<EndpointInfo endpoint={modifiedEndpoint} />);

      expect(screen.getByText('model-xyz')).toBeInTheDocument();
      expect(screen.queryByText(',')).not.toBeInTheDocument();
    });

    it('renders nothing related to service settings when all are missing', () => {
      const modifiedEndpoint = {
        ...mockEndpoint,
        service_settings: {},
      };
      render(<EndpointInfo endpoint={modifiedEndpoint} />);

      expect(screen.getByText('mistral-ai-1')).toBeInTheDocument();
      expect(screen.queryByText('model-xyz')).not.toBeInTheDocument();
      expect(screen.queryByText('max_input_tokens: 512')).not.toBeInTheDocument();
      expect(screen.queryByText('rate_limit: 1000')).not.toBeInTheDocument();
    });
  });

  describe('with googleaistudio service', () => {
    const mockEndpoint = {
      model_id: 'google-ai-1',
      service: 'googleaistudio',
      service_settings: {
        model_id: 'model-abc',
        rate_limit: {
          requests_per_minute: 500,
        },
      },
    } as any;

    it('renders the component with endpoint details', () => {
      render(<EndpointInfo endpoint={mockEndpoint} />);

      expect(screen.getByText('model-abc')).toBeInTheDocument();
      expect(screen.getByText('rate_limit: 500')).toBeInTheDocument();
    });

    it('renders correctly when rate limit is missing', () => {
      const modifiedEndpoint = {
        ...mockEndpoint,
        service_settings: {
          model_id: 'model-abc',
        },
      };

      render(<EndpointInfo endpoint={modifiedEndpoint} />);

      expect(screen.getByText('model-abc')).toBeInTheDocument();
      expect(screen.queryByText('Rate limit:')).not.toBeInTheDocument();
    });
  });

  describe('with amazonbedrock service', () => {
    const mockEndpoint = {
      model_id: 'amazon-bedrock-1',
      service: 'amazonbedrock',
      service_settings: {
        region: 'us-west-1',
        provider: 'AMAZONTITAN',
        model: 'model-bedrock-xyz',
      },
    } as any;

    it('renders the component with endpoint details', () => {
      render(<EndpointInfo endpoint={mockEndpoint} />);

      expect(screen.getByText('amazon-bedrock-1')).toBeInTheDocument();
      expect(screen.getByText('model-bedrock-xyz')).toBeInTheDocument();
      expect(screen.getByText('region: us-west-1, provider: amazontitan')).toBeInTheDocument();
    });
  });

  describe('for MIT licensed models', () => {
    const mockEndpointWithMitLicensedModel = {
      model_id: 'model-123',
      service: 'elasticsearch',
      service_settings: {
        num_allocations: 5,
        num_threads: 10,
        model_id: 'model-with-mit-license',
      },
    } as any;

    it('renders the MIT license badge if the model is eligible', () => {
      render(<EndpointInfo endpoint={mockEndpointWithMitLicensedModel} />);

      const mitBadge = screen.getByTestId('mit-license-badge');
      expect(mitBadge).toBeInTheDocument();
      expect(mitBadge).toHaveAttribute('href', 'https://abc.com');
    });

    it('does not render the MIT license badge if the model is not eligible', () => {
      const mockEndpointWithNonMitLicensedModel = {
        model_id: 'model-123',
        service: 'elasticsearch',
        service_settings: {
          num_allocations: 5,
          num_threads: 10,
          model_id: 'model-without-mit-license',
        },
      } as any;

      render(<EndpointInfo endpoint={mockEndpointWithNonMitLicensedModel} />);

      expect(screen.queryByTestId('mit-license-badge')).not.toBeInTheDocument();
    });
  });
});
