/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen } from '@testing-library/react';
import React from 'react';
import { RenderAzureAIStudio } from './render_azure_ai_studio';

describe('RenderAzureAIStudio component', () => {
  const mockEndpoint = {
    model_id: 'azure-ai-1',
    service: 'azure',
    service_settings: {
      target: 'westus',
      provider: 'microsoft_phi',
      endpoint_type: 'realtime',
    },
  } as any;

  it('renders the component with endpoint details', () => {
    render(<RenderAzureAIStudio endpoint={mockEndpoint} />);

    expect(screen.getByText('azure-ai-1')).toBeInTheDocument();
    expect(screen.getByText('microsoft_phi, realtime, westus')).toBeInTheDocument();
  });

  it('renders correctly when some service settings are missing', () => {
    const modifiedEndpoint = {
      ...mockEndpoint,
      service_settings: { target: 'westus', provider: 'microsoft_phi' },
    };
    render(<RenderAzureAIStudio endpoint={modifiedEndpoint} />);

    expect(screen.getByText('microsoft_phi, westus')).toBeInTheDocument();
  });

  it('does not render a comma when only one service setting is provided', () => {
    const modifiedEndpoint = {
      ...mockEndpoint,
      service_settings: { target: 'westus' },
    };
    render(<RenderAzureAIStudio endpoint={modifiedEndpoint} />);

    expect(screen.getByText('westus')).toBeInTheDocument();
    expect(screen.queryByText(',')).not.toBeInTheDocument();
  });

  it('renders nothing related to service settings when all are missing', () => {
    const modifiedEndpoint = {
      ...mockEndpoint,
      service_settings: {},
    };
    render(<RenderAzureAIStudio endpoint={modifiedEndpoint} />);

    expect(screen.getByText('azure-ai-1')).toBeInTheDocument();
    expect(screen.queryByText('westus')).not.toBeInTheDocument();
    expect(screen.queryByText('microsoft_phi')).not.toBeInTheDocument();
    expect(screen.queryByText('realtime')).not.toBeInTheDocument();
  });
});
