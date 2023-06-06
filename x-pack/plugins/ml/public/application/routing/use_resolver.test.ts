/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react-hooks';

import { useCreateAndNavigateToMlLink } from '../contexts/kibana/use_create_url';
import { useNotifications } from '../contexts/kibana';

import { useResolver } from './use_resolver';
import { PageDependencies } from './router';
import { createMlPageDepsMock } from '../../__mocks__/ml_start_deps';

jest.mock('../contexts/kibana/use_create_url', () => {
  return {
    useCreateAndNavigateToMlLink: jest.fn(),
  };
});

jest.mock('../contexts/kibana', () => {
  return {
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

const deps: PageDependencies = createMlPageDepsMock() as PageDependencies;

describe('useResolver', () => {
  afterEach(() => {
    jest.useFakeTimers({ legacyFakeTimers: true });
  });
  afterEach(() => {
    jest.advanceTimersByTime(0);
    jest.useRealTimers();
  });

  it('should accept undefined as dataViewId and savedSearchId.', async () => {
    const { result, waitForNextUpdate } = renderHook(() =>
      useResolver(deps, undefined, undefined, {})
    );

    await act(async () => {
      await waitForNextUpdate();
    });

    expect(result.current.context.combinedQuery).toStrictEqual({
      bool: {
        must: [
          {
            match_all: {},
          },
        ],
      },
    });
    expect(result.current.context.selectedDataView).toEqual(null);
    expect(result.current.context.selectedSavedSearch).toEqual(null);
    expect(result.current.context.kibanaConfig).toBeDefined();
    expect(result.current.context.dataViewsContract).toBeDefined();

    expect(addError).toHaveBeenCalledTimes(0);
    expect(redirectToJobsManagementPage).toHaveBeenCalledTimes(0);
  });

  it('should add an error toast and redirect if dataViewId is an empty string.', async () => {
    const { result } = renderHook(() => useResolver(deps, '', undefined, {}));

    await act(async () => {});

    expect(result.current).toStrictEqual({ context: null, results: {} });
    expect(addError).toHaveBeenCalledTimes(1);
    expect(redirectToJobsManagementPage).toHaveBeenCalledTimes(1);
  });
});
