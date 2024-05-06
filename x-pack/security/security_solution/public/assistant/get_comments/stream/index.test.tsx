/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { StreamComment } from '.';
import { useStream } from './use_stream';
const mockSetComplete = jest.fn();

jest.mock('./use_stream');

const content = 'Test Content';
const testProps = {
  refetchCurrentConversation: jest.fn(),
  content,
  index: 1,
  isControlsEnabled: true,
  connectorTypeTitle: 'OpenAI',
  regenerateMessage: jest.fn(),
  transformMessage: jest.fn(),
};

const mockReader = jest.fn() as unknown as ReadableStreamDefaultReader<Uint8Array>;

describe('StreamComment', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useStream as jest.Mock).mockReturnValue({
      error: null,
      isLoading: false,
      isStreaming: false,
      pendingMessage: 'Test Message',
      setComplete: mockSetComplete,
    });
  });
  it('renders content correctly', () => {
    render(<StreamComment {...testProps} />);

    expect(screen.getByText(content)).toBeInTheDocument();
  });

  it('renders cursor when content is loading', () => {
    render(<StreamComment {...testProps} isFetching={true} />);
    expect(screen.getByTestId('cursor')).toBeInTheDocument();
    expect(screen.queryByTestId('stopGeneratingButton')).not.toBeInTheDocument();
  });

  it('renders cursor and stopGeneratingButton when reader is loading', () => {
    render(<StreamComment {...testProps} reader={mockReader} isFetching={true} />);
    expect(screen.getByTestId('stopGeneratingButton')).toBeInTheDocument();
    expect(screen.getByTestId('cursor')).toBeInTheDocument();
  });

  it('renders controls correctly when not loading', () => {
    render(<StreamComment {...testProps} reader={mockReader} />);

    expect(screen.getByTestId('regenerateResponseButton')).toBeInTheDocument();
  });

  it('calls setComplete when StopGeneratingButton is clicked', () => {
    render(<StreamComment {...testProps} reader={mockReader} isFetching={true} />);

    fireEvent.click(screen.getByTestId('stopGeneratingButton'));

    expect(mockSetComplete).toHaveBeenCalled();
  });

  it('displays an error message correctly', () => {
    (useStream as jest.Mock).mockReturnValue({
      error: 'Test Error Message',
      isLoading: false,
      isStreaming: false,
      pendingMessage: 'Test Message',
      setComplete: mockSetComplete,
    });
    render(<StreamComment {...testProps} />);

    expect(screen.getByTestId('messsage-error')).toBeInTheDocument();
  });
});
