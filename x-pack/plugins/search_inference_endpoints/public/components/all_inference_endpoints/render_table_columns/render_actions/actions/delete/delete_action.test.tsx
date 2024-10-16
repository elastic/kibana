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

  const mockItem = {
    endpoint: 'my-hugging-face',
    provider: mockProvider,
    type: 'text_embedding',
  };

  const Wrapper = ({ preconfiguredEndpoint }: { preconfiguredEndpoint: boolean }) => {
    const queryClient = new QueryClient();
    return (
      <QueryClientProvider client={queryClient}>
        <DeleteAction preconfiguredEndpoint={preconfiguredEndpoint} selectedEndpoint={mockItem} />
      </QueryClientProvider>
    );
  };
  it('renders', () => {
    render(<Wrapper preconfiguredEndpoint={false} />);

    expect(screen.getByTestId('inferenceUIDeleteAction')).toBeEnabled();
  });

  it('disable the delete action for preconfigured endpoint', () => {
    render(<Wrapper preconfiguredEndpoint={true} />);

    expect(screen.getByTestId('inferenceUIDeleteAction')).toBeDisabled();
  });

  it('loads confirm delete modal', () => {
    render(<Wrapper preconfiguredEndpoint={false} />);

    fireEvent.click(screen.getByTestId('inferenceUIDeleteAction'));
    expect(screen.getByTestId('deleteModalForInferenceUI')).toBeInTheDocument();
  });
});
