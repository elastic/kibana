/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen } from '@testing-library/react';
import React from 'react';
import { RenderAzureOpenAI } from './render_azure_open_ai';

describe('RenderAzureOpenAI component', () => {
  const mockEndpoint = {
    model_id: 'azure-openai-1',
    service: 'azure_open_ai',
    service_settings: {
      resource_name: 'resource-xyz',
      deployment_id: 'deployment-123',
      api_version: 'v1',
    },
  } as any;

  it('renders the component with all required endpoint details', () => {
    render(<RenderAzureOpenAI endpoint={mockEndpoint} />);

    expect(screen.getByText('azure-openai-1')).toBeInTheDocument();
    expect(screen.getByText('resource-xyz, deployment-123, v1')).toBeInTheDocument();
  });
});
