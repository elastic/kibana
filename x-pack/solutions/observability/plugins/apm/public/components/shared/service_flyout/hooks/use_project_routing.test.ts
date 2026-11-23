/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook } from '@testing-library/react';
import { BehaviorSubject } from 'rxjs';
import { useProjectRouting } from './use_project_routing';

interface MockCpsManager {
  getProjectRouting: () => string | undefined;
  getProjectRouting$: () => BehaviorSubject<string | undefined>;
}

const mockCpsManager$ = new BehaviorSubject<MockCpsManager | undefined>(undefined);

jest.mock('../../../../plugin', () => ({
  get apmCpsManager$() {
    return mockCpsManager$;
  },
  getApmCpsManager: () => mockCpsManager$.getValue(),
}));

function createCpsManager(projectRouting$: BehaviorSubject<string | undefined>): MockCpsManager {
  return {
    getProjectRouting: () => projectRouting$.getValue(),
    getProjectRouting$: () => projectRouting$,
  };
}

describe('useProjectRouting', () => {
  beforeEach(() => {
    mockCpsManager$.next(undefined);
  });

  it('returns undefined while no CPS manager is published', () => {
    const { result } = renderHook(() => useProjectRouting());

    expect(result.current).toBeUndefined();
  });

  it('returns the current project routing and follows picker changes', () => {
    const projectRouting$ = new BehaviorSubject<string | undefined>('_alias:*');
    mockCpsManager$.next(createCpsManager(projectRouting$));

    const { result } = renderHook(() => useProjectRouting());

    expect(result.current).toBe('_alias:*');

    act(() => {
      projectRouting$.next('_alias:_origin');
    });

    expect(result.current).toBe('_alias:_origin');
  });

  it('follows a CPS manager published after mount', () => {
    const { result } = renderHook(() => useProjectRouting());

    expect(result.current).toBeUndefined();

    const projectRouting$ = new BehaviorSubject<string | undefined>('_alias:*');
    act(() => {
      mockCpsManager$.next(createCpsManager(projectRouting$));
    });

    expect(result.current).toBe('_alias:*');

    act(() => {
      projectRouting$.next('_alias:_origin');
    });

    expect(result.current).toBe('_alias:_origin');
  });

  it('clears the routing when the CPS manager is withdrawn', () => {
    const projectRouting$ = new BehaviorSubject<string | undefined>('_alias:*');
    mockCpsManager$.next(createCpsManager(projectRouting$));

    const { result } = renderHook(() => useProjectRouting());

    expect(result.current).toBe('_alias:*');

    act(() => {
      mockCpsManager$.next(undefined);
    });

    expect(result.current).toBeUndefined();
  });
});
