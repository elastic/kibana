/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react-hooks';
import { useStream } from './use_stream';

const amendMessage = jest.fn();
const reader = jest.fn();
const cancel = jest.fn();

const readerComplete = {
  read: reader
    .mockResolvedValueOnce({
      done: false,
      value: new Uint8Array(new TextEncoder().encode('one chunk ')),
    })
    .mockResolvedValueOnce({
      done: false,
      value: new Uint8Array(new TextEncoder().encode(`another chunk`)),
    })
    .mockResolvedValueOnce({
      done: false,
      value: new Uint8Array(new TextEncoder().encode(``)),
    })
    .mockResolvedValue({
      done: true,
    }),
  cancel,
  releaseLock: jest.fn(),
  closed: jest.fn().mockResolvedValue(true),
} as unknown as ReadableStreamDefaultReader<Uint8Array>;

const defaultProps = { amendMessage, reader: readerComplete, isError: false };
describe('useStream', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('Should stream response. isLoading/isStreaming are true while streaming, isLoading/isStreaming are false when streaming completes', async () => {
    const { result, waitFor } = renderHook(() => useStream(defaultProps));
    expect(reader).toHaveBeenCalledTimes(1);
    await waitFor(() => {
      expect(result.current).toEqual({
        error: undefined,
        isLoading: true,
        isStreaming: false,
        pendingMessage: '',
        setComplete: expect.any(Function),
      });
    });
    await waitFor(() => {
      expect(result.current).toEqual({
        error: undefined,
        isLoading: true,
        isStreaming: true,
        pendingMessage: 'one chunk ',
        setComplete: expect.any(Function),
      });
    });

    await waitFor(() => {
      expect(result.current).toEqual({
        error: undefined,
        isLoading: false,
        isStreaming: false,
        pendingMessage: 'one chunk another chunk',
        setComplete: expect.any(Function),
      });
    });

    expect(reader).toHaveBeenCalledTimes(4);
  });

  it('should not call observable when content is provided', () => {
    renderHook(() =>
      useStream({
        ...defaultProps,
        content: 'test content',
      })
    );
    expect(reader).not.toHaveBeenCalled();
  });

  it('should handle a stream error and update UseStream object accordingly', async () => {
    const errorMessage = 'Test error message';
    const errorReader = {
      read: jest
        .fn()
        .mockResolvedValueOnce({
          done: false,
          value: new Uint8Array(new TextEncoder().encode(`one chunk`)),
        })
        .mockRejectedValue(new Error(errorMessage)),
      cancel,
      releaseLock: jest.fn(),
      closed: jest.fn().mockResolvedValue(true),
    } as unknown as ReadableStreamDefaultReader<Uint8Array>;
    const { result, waitForNextUpdate } = renderHook(() =>
      useStream({
        ...defaultProps,
        reader: errorReader,
      })
    );
    expect(result.current.error).toBeUndefined();

    await waitForNextUpdate();

    expect(result.current.error).toBe(errorMessage);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.pendingMessage).toBe('');
    expect(cancel).toHaveBeenCalled();
  });

  it('should handle an empty content and reader object and return an empty observable', () => {
    const { result } = renderHook(() =>
      useStream({
        ...defaultProps,
        content: '',
        reader: undefined,
      })
    );

    expect(result.current).toEqual({
      error: undefined,
      isLoading: false,
      isStreaming: false,
      pendingMessage: '',
      setComplete: expect.any(Function),
    });
  });
});
