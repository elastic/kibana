/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen } from '@testing-library/react';
import React from 'react';
import { RenderMistral } from './render_mistral';

describe('RenderMistral component', () => {
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
    render(<RenderMistral endpoint={mockEndpoint} />);

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
    render(<RenderMistral endpoint={modifiedEndpoint} />);

    expect(screen.getByText('max_input_tokens: 512')).toBeInTheDocument();
  });

  it('does not render a comma when only one service setting is provided', () => {
    const modifiedEndpoint = {
      ...mockEndpoint,
      service_settings: { model: 'model-xyz' },
    };
    render(<RenderMistral endpoint={modifiedEndpoint} />);

    expect(screen.getByText('model-xyz')).toBeInTheDocument();
    expect(screen.queryByText(',')).not.toBeInTheDocument();
  });

  it('renders nothing related to service settings when all are missing', () => {
    const modifiedEndpoint = {
      ...mockEndpoint,
      service_settings: {},
    };
    render(<RenderMistral endpoint={modifiedEndpoint} />);

    expect(screen.getByText('mistral-ai-1')).toBeInTheDocument();
    expect(screen.queryByText('model-xyz')).not.toBeInTheDocument();
    expect(screen.queryByText('max_input_tokens: 512')).not.toBeInTheDocument();
    expect(screen.queryByText('rate_limit: 1000')).not.toBeInTheDocument();
  });
});
