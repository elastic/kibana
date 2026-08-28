/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook } from '@testing-library/react';
import { BehaviorSubject } from 'rxjs';
import { useProjectRouting } from './use_project_routing';

const mockGetApmInternalServices = jest.fn();
jest.mock('../../../../plugin', () => ({
  getApmInternalServices: () => mockGetApmInternalServices(),
}));

describe('useProjectRouting', () => {
  beforeEach(() => {
    mockGetApmInternalServices.mockReset();
  });

  it('returns undefined when the internal services are not set', () => {
    mockGetApmInternalServices.mockReturnValue(undefined);

    const { result } = renderHook(() => useProjectRouting());

    expect(result.current).toBeUndefined();
  });

  it('returns undefined when CPS is disabled (no cpsManager)', () => {
    mockGetApmInternalServices.mockReturnValue({ callApmApi: jest.fn() });

    const { result } = renderHook(() => useProjectRouting());

    expect(result.current).toBeUndefined();
  });

  it('returns the current project routing and follows picker changes', () => {
    const projectRouting$ = new BehaviorSubject<string | undefined>('_alias:*');
    mockGetApmInternalServices.mockReturnValue({
      callApmApi: jest.fn(),
      cpsManager: {
        getProjectRouting: () => projectRouting$.getValue(),
        getProjectRouting$: () => projectRouting$,
      },
    });

    const { result } = renderHook(() => useProjectRouting());

    expect(result.current).toBe('_alias:*');

    act(() => {
      projectRouting$.next('_alias:_origin');
    });

    expect(result.current).toBe('_alias:_origin');
  });
});
