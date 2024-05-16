/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react';
import * as api from './api';
import { ConnectorTypes } from '../../common/types/domain';
import { SECURITY_SOLUTION_OWNER } from '../../common/constants';
import { useToasts } from '../common/lib/kibana';
import type { AppMockRenderer } from '../common/mock';
import { createAppMockRenderer } from '../common/mock';
import { usePostCase } from './use_post_case';
import { casesQueriesKeys } from './constants';

jest.mock('./api');
jest.mock('../common/lib/kibana');

describe('usePostCase', () => {
  const samplePost = {
    description: 'description',
    tags: ['tags'],
    title: 'title',
    connector: {
      id: 'none',
      name: 'none',
      type: ConnectorTypes.none,
      fields: null,
    },
    settings: {
      syncAlerts: true,
    },
    owner: SECURITY_SOLUTION_OWNER,
  };

  const addSuccess = jest.fn();
  const addError = jest.fn();

  (useToasts as jest.Mock).mockReturnValue({ addSuccess, addError });

  let appMockRender: AppMockRenderer;

  beforeEach(() => {
    appMockRender = createAppMockRenderer();
    jest.clearAllMocks();
  });

  it('calls the api when invoked with the correct parameters', async () => {
    const spy = jest.spyOn(api, 'postCase');
    const { waitForNextUpdate, result } = renderHook(() => usePostCase(), {
      wrapper: appMockRender.AppWrapper,
    });

    act(() => {
      result.current.mutate({ request: samplePost });
    });

    await waitForNextUpdate();

    expect(spy).toHaveBeenCalledWith({ newCase: samplePost });
  });

  it('invalidates the queries correctly', async () => {
    const queryClientSpy = jest.spyOn(appMockRender.queryClient, 'invalidateQueries');
    const { waitForNextUpdate, result } = renderHook(() => usePostCase(), {
      wrapper: appMockRender.AppWrapper,
    });

    act(() => {
      result.current.mutate({ request: samplePost });
    });

    await waitForNextUpdate();

    expect(queryClientSpy).toHaveBeenCalledWith(casesQueriesKeys.casesList());
    expect(queryClientSpy).toHaveBeenCalledWith(casesQueriesKeys.tags());
    expect(queryClientSpy).toHaveBeenCalledWith(casesQueriesKeys.userProfiles());
  });

  it('does not show a success toaster', async () => {
    const { waitForNextUpdate, result } = renderHook(() => usePostCase(), {
      wrapper: appMockRender.AppWrapper,
    });

    act(() => {
      result.current.mutate({ request: samplePost });
    });

    await waitForNextUpdate();

    expect(addSuccess).not.toHaveBeenCalled();
  });

  it('shows a toast error when the api return an error', async () => {
    jest.spyOn(api, 'postCase').mockRejectedValue(new Error('usePostCase: Test error'));

    const { waitForNextUpdate, result } = renderHook(() => usePostCase(), {
      wrapper: appMockRender.AppWrapper,
    });

    act(() => {
      result.current.mutate({ request: samplePost });
    });

    await waitForNextUpdate();

    expect(addError).toHaveBeenCalled();
  });
});
