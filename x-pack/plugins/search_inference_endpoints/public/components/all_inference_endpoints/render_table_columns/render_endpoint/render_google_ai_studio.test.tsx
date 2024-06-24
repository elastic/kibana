/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen } from '@testing-library/react';
import React from 'react';
import { RenderGoogleAIStudio } from './render_google_ai_studio';

describe('RenderGoogleAIStudio component', () => {
  const mockEndpoint = {
    model_id: 'google-ai-1',
    service: 'google_ai_studio',
    service_settings: {
      model_id: 'model-abc',
      rate_limit: {
        requests_per_minute: 500,
      },
    },
  } as any;

  it('renders the component with endpoint details', () => {
    render(<RenderGoogleAIStudio endpoint={mockEndpoint} />);

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

    render(<RenderGoogleAIStudio endpoint={modifiedEndpoint} />);

    expect(screen.getByText('model-abc')).toBeInTheDocument();
    expect(screen.queryByText('Rate limit:')).not.toBeInTheDocument();
  });
});
