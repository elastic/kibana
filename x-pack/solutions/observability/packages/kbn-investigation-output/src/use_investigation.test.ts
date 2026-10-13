/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook, waitFor } from '@testing-library/react';
import type { HttpSetup } from '@kbn/core-http-browser';
import {
  AGENTIC_INVESTIGATIONS_API_VERSION,
  INVESTIGATION_BY_ID_URL,
} from '@kbn/agentic-investigations-plugin/common';
import { INVESTIGATION_POLL_INTERVAL_MS, useInvestigation } from './use_investigation';

const createHttp = () => ({ get: jest.fn() } as unknown as HttpSetup & { get: jest.Mock });

describe('useInvestigation', () => {
  afterEach(() => jest.useRealTimers());

  it('reads the investigation from the shared API and reports it complete', async () => {
    const http = createHttp();
    http.get.mockResolvedValue({ id: 'conv-1', in_progress: false });

    const { result } = renderHook(() => useInvestigation({ http, investigationId: 'conv-1' }));

    expect(result.current.status).toBe('loading');
    await waitFor(() => expect(result.current.status).toBe('complete'));
    expect(result.current.investigation).toEqual({ id: 'conv-1', in_progress: false });
    // The hook spells the route out; it must stay the shared API's.
    expect(http.get).toHaveBeenCalledWith(INVESTIGATION_BY_ID_URL.replace('{id}', 'conv-1'), {
      version: AGENTIC_INVESTIGATIONS_API_VERSION,
      signal: expect.any(AbortSignal),
    });
  });

  it('polls while the investigation is in progress and stops once it is not', async () => {
    jest.useFakeTimers();
    const http = createHttp();
    http.get
      .mockResolvedValueOnce({ id: 'conv-1', in_progress: true })
      .mockResolvedValueOnce({ id: 'conv-1', in_progress: false });

    const { result } = renderHook(() => useInvestigation({ http, investigationId: 'conv-1' }));

    await waitFor(() => expect(result.current.status).toBe('running'));
    await act(async () => {
      jest.advanceTimersByTime(INVESTIGATION_POLL_INTERVAL_MS);
    });
    await waitFor(() => expect(result.current.status).toBe('complete'));
    await act(async () => {
      jest.advanceTimersByTime(INVESTIGATION_POLL_INTERVAL_MS * 2);
    });
    expect(http.get).toHaveBeenCalledTimes(2);
  });

  it('reports a forbidden read as unavailable', async () => {
    const http = createHttp();
    http.get.mockRejectedValue(
      Object.assign(new Error('Forbidden'), { response: { status: 403 }, body: {} })
    );

    const { result } = renderHook(() => useInvestigation({ http, investigationId: 'conv-1' }));

    await waitFor(() => expect(result.current.status).toBe('unavailable'));
    expect(result.current.error).toBe("You don't have permission to view this investigation.");
  });

  it('reads nothing without an id', () => {
    const http = createHttp();

    renderHook(() => useInvestigation({ http, investigationId: undefined }));

    expect(http.get).not.toHaveBeenCalled();
  });
});
