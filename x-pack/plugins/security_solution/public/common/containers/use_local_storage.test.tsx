/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { renderHook, act } from '@testing-library/react-hooks';
import { useSecurityLocalStorage, UseSecurityLocalStorage } from './use_local_storage';

const localStorageMock = () => {
  let store: Record<string, unknown> = {};

  return {
    getItem: (key: string) => {
      return store[key] || null;
    },
    setItem: (key: string, value: unknown) => {
      store[key] = value;
    },
    clear() {
      store = {};
    },
  };
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock(),
});

describe('useLocalStorage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should return an empty array when there is no plugin settings', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<string, UseSecurityLocalStorage>(() =>
        useSecurityLocalStorage()
      );
      await waitForNextUpdate();
      const { getCallouts } = result.current;
      expect(getCallouts('case')).toEqual([]);
    });
  });

  it('should return an empty array when there is no callouts', async () => {
    localStorage.setItem('case', JSON.stringify({ foo: 'bar' }));
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<string, UseSecurityLocalStorage>(() =>
        useSecurityLocalStorage()
      );
      await waitForNextUpdate();
      const { getCallouts } = result.current;
      expect(getCallouts('case')).toEqual([]);
    });
  });

  it('should return the callouts', async () => {
    localStorage.setItem('case', JSON.stringify({ callouts: ['id-1'] }));
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<string, UseSecurityLocalStorage>(() =>
        useSecurityLocalStorage()
      );
      await waitForNextUpdate();
      const { getCallouts } = result.current;
      expect(getCallouts('case')).toEqual(['id-1']);
    });
  });

  it('persist a callout', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<string, UseSecurityLocalStorage>(() =>
        useSecurityLocalStorage()
      );
      await waitForNextUpdate();
      const { getCallouts, persistDismissCallout } = result.current;
      persistDismissCallout('case', 'id-1');
      expect(getCallouts('case')).toEqual(['id-1']);
    });
  });

  it('updates the callouts correctly', async () => {
    localStorage.setItem('case', JSON.stringify({ callouts: ['id-1'] }));
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<string, UseSecurityLocalStorage>(() =>
        useSecurityLocalStorage()
      );
      await waitForNextUpdate();
      const { getCallouts, persistDismissCallout } = result.current;
      persistDismissCallout('case', 'id-2');
      expect(getCallouts('case')).toEqual(['id-1', 'id-2']);
    });
  });
});
