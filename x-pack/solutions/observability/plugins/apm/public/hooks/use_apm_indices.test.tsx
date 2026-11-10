/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, waitFor } from '@testing-library/react';
import type { HttpStart } from '@kbn/core/public';
import type { APMIndices } from '@kbn/apm-sources-access-plugin/common/config_schema';
import { useResolvedApmIndices } from './use_apm_indices';

const INDICES = { transaction: 'traces-apm*' } as APMIndices;

function createHttp(fetchImpl = jest.fn().mockResolvedValue(INDICES)) {
  return {
    http: { fetch: fetchImpl } as unknown as HttpStart,
    fetchImpl,
  };
}

describe('useResolvedApmIndices', () => {
  it('uses parent indices and does not fetch, including while the parent is still loading', () => {
    const { http, fetchImpl } = createHttp();
    const { result, rerender } = renderHook(
      ({ indices }: { indices: APMIndices | null | undefined }) =>
        useResolvedApmIndices({ http, indicesSource: { indices } }),
      { initialProps: { indices: undefined as APMIndices | null | undefined } }
    );

    expect(result.current).toBeUndefined();
    expect(fetchImpl).not.toHaveBeenCalled();

    rerender({ indices: null });
    expect(result.current).toBeNull();

    rerender({ indices: INDICES });
    expect(result.current).toBe(INDICES);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('fetches once when no parent source is provided', async () => {
    const { http, fetchImpl } = createHttp();
    const { result, rerender } = renderHook(() => useResolvedApmIndices({ http }));

    expect(result.current).toBeUndefined();

    await waitFor(() => {
      expect(result.current).toEqual(INDICES);
    });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(fetchImpl).toHaveBeenCalledWith(
      '/internal/apm-sources/settings/apm-indices',
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    );

    rerender();
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('returns null when the fetch fails', async () => {
    const { http } = createHttp(jest.fn().mockRejectedValue(new Error('indices failed')));
    const { result } = renderHook(() => useResolvedApmIndices({ http }));

    await waitFor(() => {
      expect(result.current).toBeNull();
    });
  });
});
