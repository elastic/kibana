/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen } from '@testing-library/react';
import React from 'react';
import { EndpointInfo } from './endpoint_info';

describe('RenderEndpoint component tests', () => {
  it('renders the component with inference id', () => {
    const mockProvider = {
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

    render(<EndpointInfo inferenceId={'cohere-2'} provider={mockProvider} />);

    expect(screen.getByText('cohere-2')).toBeInTheDocument();
  });

  it('renders correctly without model_id in service_settings', () => {
    const mockProvider = {
      inference_id: 'azure-openai-1',
      service: 'azureopenai',
      service_settings: {
        resource_name: 'resource-xyz',
        deployment_id: 'deployment-123',
        api_version: 'v1',
      },
    } as any;

    render(<EndpointInfo inferenceId={'azure-openai-1'} provider={mockProvider} />);

    expect(screen.getByText('azure-openai-1')).toBeInTheDocument();
  });

  it('renders with tech preview badge when endpoint is reranker type', () => {
    const mockProvider = {
      inference_id: 'elastic-rerank',
      task_type: 'rerank',
      service: 'elasticsearch',
      service_settings: {
        num_allocations: 1,
        num_threads: 1,
        model_id: '.rerank-v1',
      },
      task_settings: {
        return_documents: true,
      },
    } as any;

    render(<EndpointInfo inferenceId={'elastic-rerank'} provider={mockProvider} />);

    expect(screen.getByText('elastic-rerank')).toBeInTheDocument();
    expect(screen.getByText('TECH PREVIEW')).toBeInTheDocument();
  });
});
