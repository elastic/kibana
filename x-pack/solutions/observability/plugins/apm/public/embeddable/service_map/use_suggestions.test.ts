/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import type { CoreStart } from '@kbn/core/public';
import { useSuggestions } from './use_suggestions';

describe('useSuggestions', () => {
  const mockHttpGet = jest.fn();
  const mockCore = {
    http: { get: mockHttpGet },
  } as unknown as CoreStart;

  const defaultParams = {
    core: mockCore,
    fieldName: 'service.name',
    start: '2021-10-10T00:00:00.000Z',
    end: '2021-10-10T00:15:00.000Z',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockHttpGet.mockResolvedValue({ terms: [] });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns initial state with empty terms and not loading', () => {
    const { result } = renderHook(() => useSuggestions(defaultParams));

    expect(result.current.terms).toEqual([]);
    expect(result.current.isLoading).toBe(false);
    expect(typeof result.current.onSearchChange).toBe('function');
  });

  it('fetches suggestions for empty search value', async () => {
    mockHttpGet.mockResolvedValue({ terms: ['service-a', 'service-b'] });
    const { result } = renderHook(() => useSuggestions(defaultParams));

    act(() => {
      result.current.onSearchChange('');
    });

    act(() => {
      jest.advanceTimersByTime(300);
    });

    await waitFor(() => {
      expect(mockHttpGet).toHaveBeenCalledWith('/internal/apm/suggestions', {
        query: {
          fieldName: 'service.name',
          fieldValue: '',
          start: '2021-10-10T00:00:00.000Z',
          end: '2021-10-10T00:15:00.000Z',
        },
        signal: expect.any(AbortSignal),
        version: '2023-10-31',
      });
    });
  });

  it('fetches suggestions with correct parameters after debounce', async () => {
    mockHttpGet.mockResolvedValue({ terms: ['service-a', 'service-b'] });
    const { result } = renderHook(() => useSuggestions(defaultParams));

    act(() => {
      result.current.onSearchChange('serv');
    });

    expect(mockHttpGet).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(300);
    });

    await waitFor(() => {
      expect(mockHttpGet).toHaveBeenCalledWith('/internal/apm/suggestions', {
        query: {
          fieldName: 'service.name',
          fieldValue: 'serv',
          start: '2021-10-10T00:00:00.000Z',
          end: '2021-10-10T00:15:00.000Z',
        },
        signal: expect.any(AbortSignal),
        version: '2023-10-31',
      });
    });

    await waitFor(() => {
      expect(result.current.terms).toEqual(['service-a', 'service-b']);
    });
  });

  it('includes serviceName in query when provided', async () => {
    mockHttpGet.mockResolvedValue({ terms: ['production', 'staging'] });
    const { result } = renderHook(() =>
      useSuggestions({ ...defaultParams, fieldName: 'service.environment', serviceName: 'my-svc' })
    );

    act(() => {
      result.current.onSearchChange('prod');
    });

    act(() => {
      jest.advanceTimersByTime(300);
    });

    await waitFor(() => {
      expect(mockHttpGet).toHaveBeenCalledWith('/internal/apm/suggestions', {
        query: {
          fieldName: 'service.environment',
          fieldValue: 'prod',
          start: '2021-10-10T00:00:00.000Z',
          end: '2021-10-10T00:15:00.000Z',
          serviceName: 'my-svc',
        },
        signal: expect.any(AbortSignal),
        version: '2023-10-31',
      });
    });
  });

  it('sets isLoading to true while fetching', async () => {
    let resolvePromise: (value: { terms: string[] }) => void;
    mockHttpGet.mockReturnValue(
      new Promise((resolve) => {
        resolvePromise = resolve;
      })
    );

    const { result } = renderHook(() => useSuggestions(defaultParams));

    act(() => {
      result.current.onSearchChange('test');
    });

    act(() => {
      jest.advanceTimersByTime(300);
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(true);
    });

    await act(async () => {
      resolvePromise!({ terms: ['test-service'] });
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
  });

  it('clears terms and sets isLoading to false on error', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockHttpGet.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useSuggestions(defaultParams));

    act(() => {
      result.current.onSearchChange('test');
    });

    act(() => {
      jest.advanceTimersByTime(300);
    });

    await waitFor(() => {
      expect(result.current.terms).toEqual([]);
      expect(result.current.isLoading).toBe(false);
    });

    expect(consoleErrorSpy).toHaveBeenCalledWith('Error fetching suggestions:', expect.any(Error));
    consoleErrorSpy.mockRestore();
  });

  it('does not log error for AbortError', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const abortError = new Error('Aborted');
    abortError.name = 'AbortError';
    mockHttpGet.mockRejectedValue(abortError);

    const { result } = renderHook(() => useSuggestions(defaultParams));

    act(() => {
      result.current.onSearchChange('test');
    });

    act(() => {
      jest.advanceTimersByTime(300);
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(consoleErrorSpy).not.toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });

  it('debounces multiple rapid search changes', async () => {
    mockHttpGet.mockResolvedValue({ terms: ['result'] });
    const { result } = renderHook(() => useSuggestions(defaultParams));

    act(() => {
      result.current.onSearchChange('s');
      result.current.onSearchChange('se');
      result.current.onSearchChange('ser');
      result.current.onSearchChange('serv');
    });

    act(() => {
      jest.advanceTimersByTime(300);
    });

    await waitFor(() => {
      expect(mockHttpGet).toHaveBeenCalledTimes(1);
      expect(mockHttpGet).toHaveBeenCalledWith(
        '/internal/apm/suggestions',
        expect.objectContaining({
          query: expect.objectContaining({ fieldValue: 'serv' }),
        })
      );
    });
  });

  it('fetches all terms on mount when fetchOnMount is true', async () => {
    mockHttpGet.mockResolvedValue({ terms: ['service-a', 'service-b'] });

    const { result } = renderHook(() => useSuggestions({ ...defaultParams, fetchOnMount: true }));

    await waitFor(() => {
      expect(mockHttpGet).toHaveBeenCalledWith('/internal/apm/suggestions', {
        query: {
          fieldName: 'service.name',
          fieldValue: '',
          start: '2021-10-10T00:00:00.000Z',
          end: '2021-10-10T00:15:00.000Z',
        },
        signal: expect.any(AbortSignal),
        version: '2023-10-31',
      });
    });

    await waitFor(() => {
      expect(result.current.terms).toEqual(['service-a', 'service-b']);
    });
  });

  it('does not fetch on mount when fetchOnMount is false', () => {
    renderHook(() => useSuggestions(defaultParams));

    expect(mockHttpGet).not.toHaveBeenCalled();
  });

  it('re-fetches when serviceName changes with fetchOnMount enabled', async () => {
    mockHttpGet.mockResolvedValue({ terms: ['service-a'] });

    const { rerender } = renderHook(
      ({ serviceName }) => useSuggestions({ ...defaultParams, fetchOnMount: true, serviceName }),
      { initialProps: { serviceName: undefined as string | undefined } }
    );

    await waitFor(() => {
      expect(mockHttpGet).toHaveBeenCalledTimes(1);
    });

    mockHttpGet.mockResolvedValue({ terms: ['env-a', 'env-b'] });
    rerender({ serviceName: 'new-service' });

    await waitFor(() => {
      expect(mockHttpGet).toHaveBeenCalledTimes(2);
    });

    expect(mockHttpGet).toHaveBeenLastCalledWith('/internal/apm/suggestions', {
      query: {
        fieldName: 'service.name',
        fieldValue: '',
        start: '2021-10-10T00:00:00.000Z',
        end: '2021-10-10T00:15:00.000Z',
        serviceName: 'new-service',
      },
      signal: expect.any(AbortSignal),
      version: '2023-10-31',
    });
  });

  it('fetchAllTerms manually triggers a fetch with empty fieldValue', async () => {
    mockHttpGet.mockResolvedValue({ terms: ['all-services'] });
    const { result } = renderHook(() => useSuggestions(defaultParams));

    act(() => {
      result.current.fetchAllTerms();
    });

    await waitFor(() => {
      expect(mockHttpGet).toHaveBeenCalledWith('/internal/apm/suggestions', {
        query: {
          fieldName: 'service.name',
          fieldValue: '',
          start: '2021-10-10T00:00:00.000Z',
          end: '2021-10-10T00:15:00.000Z',
        },
        signal: expect.any(AbortSignal),
        version: '2023-10-31',
      });
    });

    await waitFor(() => {
      expect(result.current.terms).toEqual(['all-services']);
    });
  });
});
