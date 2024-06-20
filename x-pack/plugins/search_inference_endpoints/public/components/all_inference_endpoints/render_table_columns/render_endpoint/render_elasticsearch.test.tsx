/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { screen } from '@testing-library/react';
import { renderReactTestingLibraryWithI18n as render } from '@kbn/test-jest-helpers';
import React from 'react';
import { RenderElasticsearch } from './render_elasticsearch';

describe('RenderElasticsearch component', () => {
  const mockEndpoint = {
    model_id: 'model-123',
    service_settings: {
      num_allocations: 5,
      num_threads: 10,
      model_id: 'settings-model-123',
    },
  } as any;

  it('renders the component with endpoint model_id and model settings', () => {
    render(<RenderElasticsearch endpoint={mockEndpoint} />);

    expect(screen.getByText('model-123')).toBeInTheDocument();
    expect(screen.getByText('settings-model-123')).toBeInTheDocument();
    expect(screen.getByText('Threads: 10 | Allocations: 5')).toBeInTheDocument();
  });

  it('renders the component without model settings if service_settings is null', () => {
    const modifiedEndpoint = { ...mockEndpoint, service_settings: null };
    render(<RenderElasticsearch endpoint={modifiedEndpoint} />);

    expect(screen.getByText('model-123')).toBeInTheDocument();
    expect(screen.queryByText('settings-model-123')).not.toBeInTheDocument();
    expect(screen.queryByText('Threads: 10 | Allocations: 5')).not.toBeInTheDocument();
  });

  it('renders the component with only model_id if num_threads and num_allocations are not provided', () => {
    const modifiedSettings = {
      ...mockEndpoint.service_settings,
      num_threads: undefined,
      num_allocations: undefined,
    };
    const modifiedEndpoint = { ...mockEndpoint, service_settings: modifiedSettings };
    render(<RenderElasticsearch endpoint={modifiedEndpoint} />);

    expect(screen.getByText('model-123')).toBeInTheDocument();
    expect(screen.getByText('settings-model-123')).toBeInTheDocument();
    expect(screen.queryByText('Threads: 10 | Allocations: 5')).not.toBeInTheDocument();
  });
});
