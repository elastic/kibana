/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react-hooks';
import { MlStorageContextProvider, useStorage } from './storage_context';
import { MlStorageKey } from '../../../../common/types/storage';

const mockSet = jest.fn();
const mockRemove = jest.fn();

jest.mock('../kibana', () => ({
  useMlKibana: () => {
    return {
      services: {
        storage: {
          set: mockSet,
          get: jest.fn((key: MlStorageKey) => {
            switch (key) {
              case 'ml.gettingStarted.isDismissed':
                return true;
              default:
                return;
            }
          }),
          remove: mockRemove,
        },
      },
    };
  },
}));

describe('useStorage', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('returns the default value', () => {
    const { result } = renderHook(() => useStorage('ml.jobSelectorFlyout.applyTimeRange', true), {
      wrapper: MlStorageContextProvider,
    });

    expect(result.current[0]).toBe(true);
  });

  test('returns the value from storage', () => {
    const { result } = renderHook(() => useStorage('ml.gettingStarted.isDismissed', false), {
      wrapper: MlStorageContextProvider,
    });

    expect(result.current[0]).toBe(true);
  });

  test('updates the storage value', async () => {
    const { result, waitForNextUpdate } = renderHook(
      () => useStorage('ml.gettingStarted.isDismissed'),
      {
        wrapper: MlStorageContextProvider,
      }
    );

    const [value, setValue] = result.current;

    expect(value).toBe(true);

    await act(async () => {
      setValue(false);
      await waitForNextUpdate();
    });

    expect(result.current[0]).toBe(false);
    expect(mockSet).toHaveBeenCalledWith('ml.gettingStarted.isDismissed', false);
  });

  test('removes the storage value', async () => {
    const { result, waitForNextUpdate } = renderHook(
      () => useStorage('ml.gettingStarted.isDismissed'),
      {
        wrapper: MlStorageContextProvider,
      }
    );

    const [value, setValue] = result.current;

    expect(value).toBe(true);

    await act(async () => {
      setValue(undefined);
      await waitForNextUpdate();
    });

    expect(result.current[0]).toBe(undefined);
    expect(mockRemove).toHaveBeenCalledWith('ml.gettingStarted.isDismissed');
  });

  test('updates the value on storage event', async () => {
    const { result, waitForNextUpdate } = renderHook(
      () => useStorage('ml.gettingStarted.isDismissed'),
      {
        wrapper: MlStorageContextProvider,
      }
    );

    expect(result.current[0]).toBe(true);

    await act(async () => {
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: 'test_key',
          newValue: 'test_value',
        })
      );
    });

    expect(result.current[0]).toBe(true);

    await act(async () => {
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: 'ml.gettingStarted.isDismissed',
          newValue: null,
        })
      );
      await waitForNextUpdate();
    });

    expect(result.current[0]).toBe(undefined);

    await act(async () => {
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: 'ml.gettingStarted.isDismissed',
          newValue: 'false',
        })
      );
      await waitForNextUpdate();
    });

    expect(result.current[0]).toBe(false);
  });
});
