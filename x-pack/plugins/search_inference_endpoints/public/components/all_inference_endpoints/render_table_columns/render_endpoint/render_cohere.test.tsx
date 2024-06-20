/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen } from '@testing-library/react';
import React from 'react';
import { RenderCohere } from './render_cohere';

describe('RenderCohere component', () => {
  const mockEndpoint = {
    model_id: 'cohere-2',
    task_type: 'text_embedding',
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

  it('renders the component with endpoint details', () => {
    render(<RenderCohere endpoint={mockEndpoint} />);

    expect(screen.getByText('cohere-2')).toBeInTheDocument();
    expect(screen.getByText('byte')).toBeInTheDocument();
    expect(screen.getByText('embed-english-light-v3.0')).toBeInTheDocument();
  });

  it('does not render model_id badge if serviceSettings.model_id is not provided', () => {
    const modifiedEndpoint = {
      ...mockEndpoint,
      service_settings: { ...mockEndpoint.service_settings, model_id: undefined },
    };
    render(<RenderCohere endpoint={modifiedEndpoint} />);

    expect(screen.queryByText('embed-english-light-v3.0')).not.toBeInTheDocument();
  });

  it('renders only model_id if other settings are not provided', () => {
    const modifiedEndpoint = {
      ...mockEndpoint,
      service_settings: { model_id: 'embed-english-light-v3.0' },
    };
    render(<RenderCohere endpoint={modifiedEndpoint} />);

    expect(screen.getByText('embed-english-light-v3.0')).toBeInTheDocument();
    expect(screen.queryByText(',')).not.toBeInTheDocument();
  });
});
