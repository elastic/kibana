/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { renderHook, act } from '@testing-library/react-hooks';

import { IUiSettingsClient } from 'kibana/public';

import { useCreateAndNavigateToMlLink } from '../contexts/kibana/use_create_url';
import { useNotifications } from '../contexts/kibana';

import { useResolver } from './use_resolver';

jest.mock('../contexts/kibana/use_create_url', () => {
  return {
    useCreateAndNavigateToMlLink: jest.fn(),
  };
});

jest.mock('../contexts/kibana', () => {
  return {
    useMlUrlGenerator: () => ({
      createUrl: jest.fn(),
    }),
    useNavigateToPath: () => jest.fn(),
    useNotifications: jest.fn(),
  };
});

const addError = jest.fn();
(useNotifications as jest.Mock).mockImplementation(() => ({
  toasts: { addSuccess: jest.fn(), addDanger: jest.fn(), addError },
}));

const redirectToJobsManagementPage = jest.fn(() => Promise.resolve());
(useCreateAndNavigateToMlLink as jest.Mock).mockImplementation(() => redirectToJobsManagementPage);

describe('useResolver', () => {
  afterEach(() => {
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.advanceTimersByTime(0);
    jest.useRealTimers();
  });

  it('should accept undefined as indexPatternId and savedSearchId.', async () => {
    const { result, waitForNextUpdate } = renderHook(() =>
      useResolver(undefined, undefined, {} as IUiSettingsClient, {})
    );

    await act(async () => {
      await waitForNextUpdate();
    });

    expect(result.current).toStrictEqual({
      context: {
        combinedQuery: {
          bool: {
            must: [
              {
                match_all: {},
              },
            ],
          },
        },
        currentIndexPattern: null,
        currentSavedSearch: null,
        indexPatterns: null,
        kibanaConfig: {},
      },
      results: {},
    });
    expect(addError).toHaveBeenCalledTimes(0);
    expect(redirectToJobsManagementPage).toHaveBeenCalledTimes(0);
  });

  it('should add an error toast and redirect if indexPatternId is an empty string.', async () => {
    const { result } = renderHook(() => useResolver('', undefined, {} as IUiSettingsClient, {}));

    await act(async () => {});

    expect(result.current).toStrictEqual({ context: null, results: {} });
    expect(addError).toHaveBeenCalledTimes(1);
    expect(redirectToJobsManagementPage).toHaveBeenCalledTimes(1);
  });
});
