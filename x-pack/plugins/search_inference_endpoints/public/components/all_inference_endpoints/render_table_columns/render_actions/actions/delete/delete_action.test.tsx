/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

import { DeleteAction } from './delete_action';
import { InferenceEndpointUI } from '../../../../types';

describe('Delete Action', () => {
  const mockProvider = {
    inference_id: 'my-hugging-face',
    service: 'hugging_face',
    service_settings: {
      api_key: 'aaaa',
      url: 'https://dummy.huggingface.com',
    },
    task_settings: {},
  } as any;

  const mockItem: InferenceEndpointUI = {
    endpoint: 'my-hugging-face',
    provider: mockProvider,
    type: 'text_embedding',
  };

  const Wrapper = ({ item }: { item: InferenceEndpointUI }) => {
    const queryClient = new QueryClient();
    return (
      <QueryClientProvider client={queryClient}>
        <DeleteAction selectedEndpoint={item} />
      </QueryClientProvider>
    );
  };
  it('renders', () => {
    render(<Wrapper item={mockItem} />);

    expect(screen.getByTestId('inferenceUIDeleteAction')).toBeEnabled();
  });

  it('disable the delete action for preconfigured endpoint', () => {
    const preconfiguredMockItem = { ...mockItem, endpoint: '.multilingual-e5-small-elasticsearch' };
    render(<Wrapper item={preconfiguredMockItem} />);

    expect(screen.getByTestId('inferenceUIDeleteAction')).toBeDisabled();
  });

  it('loads confirm delete modal', () => {
    render(<Wrapper item={mockItem} />);

    fireEvent.click(screen.getByTestId('inferenceUIDeleteAction'));
    expect(screen.getByTestId('deleteModalForInferenceUI')).toBeInTheDocument();
  });
});
