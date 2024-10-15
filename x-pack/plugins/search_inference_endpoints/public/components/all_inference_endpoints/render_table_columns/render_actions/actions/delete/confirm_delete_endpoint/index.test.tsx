/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, fireEvent, screen } from '@testing-library/react';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import React from 'react';
import { ConfirmDeleteEndpointModal } from '.';
import * as i18n from './translations';
import { useScanUsage } from '../../../../../../../hooks/use_scan_usage';

jest.mock('../../../../../../../hooks/use_scan_usage');
const mockUseScanUsage = useScanUsage as jest.Mock;

describe('ConfirmDeleteEndpointModal', () => {
  const mockOnCancel = jest.fn();
  const mockOnConfirm = jest.fn();

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

  const Wrapper = () => {
    const queryClient = new QueryClient();
    return (
      <QueryClientProvider client={queryClient}>
        <ConfirmDeleteEndpointModal
          onCancel={mockOnCancel}
          onConfirm={mockOnConfirm}
          inferenceEndpoint={mockItem}
        />
      </QueryClientProvider>
    );
  };

  beforeEach(() => {
    mockUseScanUsage.mockReturnValue({
      data: {
        indexes: ['index-1', 'index2'],
        pipelines: ['pipeline-1'],
      },
    });
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('renders the modal with correct elements', () => {
    render(<Wrapper />);

    expect(screen.getByText(i18n.DELETE_TITLE)).toBeInTheDocument();
    expect(screen.getByText(i18n.CONFIRM_DELETE_WARNING)).toBeInTheDocument();
    expect(screen.getByText(i18n.CANCEL)).toBeInTheDocument();
    expect(screen.getByText(i18n.DELETE_ACTION_LABEL)).toBeInTheDocument();
    expect(screen.getByText('my-hugging-face')).toBeInTheDocument();
  });

  it('calls onCancel when the cancel button is clicked', () => {
    render(<Wrapper />);

    fireEvent.click(screen.getByText(i18n.CANCEL));
    expect(mockOnCancel).toHaveBeenCalled();
  });

  it('useScanUsage gets called with correct params', () => {
    render(<Wrapper />);

    expect(mockUseScanUsage).toHaveBeenCalledWith({
      type: 'text_embedding',
      id: 'my-hugging-face',
    });
  });

  describe('endpoint with usage', () => {
    it('disables delete endpoint button', () => {
      render(<Wrapper />);
      expect(screen.getByTestId('confirmModalConfirmButton')).toBeDisabled();
    });

    it('renders warning message', () => {
      render(<Wrapper />);
      expect(screen.getByText(i18n.POTENTIAL_FAILURE_LABEL)).toBeInTheDocument();
    });

    it('selecting checkbox enables Delete Endpoint button', () => {
      render(<Wrapper />);
      fireEvent.click(screen.getByTestId('warningCheckbox'));

      expect(screen.getByTestId('confirmModalConfirmButton')).toBeEnabled();
    });
  });

  describe('endpoint without usage', () => {
    beforeEach(() => {
      mockUseScanUsage.mockReturnValue({
        data: {
          indexes: [],
          pipelines: [],
        },
      });

      render(<Wrapper />);
    });
    it('renders no usage message', () => {
      expect(screen.getByText(i18n.NO_USAGE_FOUND_LABEL)).toBeInTheDocument();
    });

    it('enables delete endpoint button', () => {
      expect(screen.getByTestId('confirmModalConfirmButton')).toBeEnabled();
    });

    it('calls onConfirm when the delete button is clicked', () => {
      fireEvent.click(screen.getByText(i18n.DELETE_ACTION_LABEL));
      expect(mockOnConfirm).toHaveBeenCalled();
    });
  });
});
