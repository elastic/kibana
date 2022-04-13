/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react-hooks';

import { IUiSettingsClient } from 'kibana/public';

import { useCreateAndNavigateToMlLink } from '../contexts/kibana/use_create_url';
import { useNotifications } from '../contexts/kibana';
import type { DataViewsContract } from '../../../../../../src/plugins/data_views/public';

import { useResolver } from './use_resolver';

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

describe('useResolver', () => {
  afterEach(() => {
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.advanceTimersByTime(0);
    jest.useRealTimers();
  });

  it('should accept undefined as dataViewId and savedSearchId.', async () => {
    const { result, waitForNextUpdate } = renderHook(() =>
      useResolver(undefined, undefined, {} as IUiSettingsClient, {} as DataViewsContract, {})
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
        currentDataView: null,
        currentSavedSearch: null,
        dataViewsContract: {},
        kibanaConfig: {},
      },
      results: {},
    });
    expect(addError).toHaveBeenCalledTimes(0);
    expect(redirectToJobsManagementPage).toHaveBeenCalledTimes(0);
  });

  it('should add an error toast and redirect if dataViewId is an empty string.', async () => {
    const { result } = renderHook(() =>
      useResolver('', undefined, {} as IUiSettingsClient, {} as DataViewsContract, {})
    );

    await act(async () => {});

    expect(result.current).toStrictEqual({ context: null, results: {} });
    expect(addError).toHaveBeenCalledTimes(1);
    expect(redirectToJobsManagementPage).toHaveBeenCalledTimes(1);
  });
});
