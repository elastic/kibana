/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react-hooks';
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

  test('shows render a default value', () => {
    const { result } = renderHook(() => useStorage('ml.jobSelectorFlyout.applyTimeRange', true), {
      wrapper: MlStorageContextProvider,
    });

    expect(result.current[0]).toBe(true);
  });

  test('shows value from provider', () => {
    const { result } = renderHook(() => useStorage('ml.gettingStarted.isDismissed', false), {
      wrapper: MlStorageContextProvider,
    });

    expect(result.current[0]).toBe(true);
  });

  test('updates the value', () => {
    const { result } = renderHook(() => useStorage('ml.gettingStarted.isDismissed'), {
      wrapper: MlStorageContextProvider,
    });

    const [value, setValue] = result.current;

    expect(value).toBe(true);

    setValue(false);

    expect(mockSet).toHaveBeenCalledWith('ml.gettingStarted.isDismissed', false);
  });

  test('removes the value', () => {
    const { result } = renderHook(() => useStorage('ml.gettingStarted.isDismissed'), {
      wrapper: MlStorageContextProvider,
    });

    const [value, setValue] = result.current;

    expect(value).toBe(true);

    setValue(undefined);

    expect(mockRemove).toHaveBeenCalledWith('ml.gettingStarted.isDismissed');
  });
});
