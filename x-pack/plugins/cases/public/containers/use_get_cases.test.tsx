/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react-hooks';
import { DEFAULT_FILTER_OPTIONS, DEFAULT_QUERY_PARAMS } from './constants';
import { useGetCases } from './use_get_cases';
import * as api from './api';
import type { AppMockRenderer } from '../common/mock';
import { createAppMockRenderer } from '../common/mock';
import { useToasts } from '../common/lib/kibana/hooks';
import { OWNERS } from '../../common/constants';

jest.mock('./api');
jest.mock('../common/lib/kibana/hooks');

// FLAKY: https://github.com/elastic/kibana/issues/178163
describe.skip('useGetCases', () => {
  const abortCtrl = new AbortController();
  const addSuccess = jest.fn();
  (useToasts as jest.Mock).mockReturnValue({ addSuccess, addError: jest.fn() });

  let appMockRender: AppMockRenderer;

  beforeEach(() => {
    jest.clearAllMocks();
    appMockRender = createAppMockRenderer();
  });

  it('calls getCases with correct arguments', async () => {
    const spyOnGetCases = jest.spyOn(api, 'getCases');
    const { waitForNextUpdate } = renderHook(() => useGetCases(), {
      wrapper: appMockRender.AppWrapper,
    });

    await waitForNextUpdate();
    expect(spyOnGetCases).toBeCalledWith({
      filterOptions: { ...DEFAULT_FILTER_OPTIONS, owner: ['securitySolution'] },
      queryParams: DEFAULT_QUERY_PARAMS,
      signal: abortCtrl.signal,
    });
  });

  it('shows a toast error message when an error occurs in the response', async () => {
    const spyOnGetCases = jest.spyOn(api, 'getCases');
    spyOnGetCases.mockImplementation(() => {
      throw new Error('Something went wrong');
    });

    const addError = jest.fn();
    (useToasts as jest.Mock).mockReturnValue({ addSuccess, addError });

    const { waitForNextUpdate } = renderHook(() => useGetCases(), {
      wrapper: appMockRender.AppWrapper,
    });

    await waitForNextUpdate();
    expect(addError).toHaveBeenCalled();
  });

  it('should set all owners when no owner is provided', async () => {
    appMockRender = createAppMockRenderer({ owner: [] });

    appMockRender.coreStart.application.capabilities = {
      ...appMockRender.coreStart.application.capabilities,
      observabilityCases: {
        create_cases: true,
        read_cases: true,
        update_cases: true,
        push_cases: true,
        cases_connectors: true,
        delete_cases: true,
        cases_settings: true,
      },
      securitySolutionCases: {
        create_cases: true,
        read_cases: true,
        update_cases: true,
        push_cases: true,
        cases_connectors: true,
        delete_cases: true,
        cases_settings: true,
      },
    };

    const spyOnGetCases = jest.spyOn(api, 'getCases');
    const { waitForNextUpdate } = renderHook(() => useGetCases(), {
      wrapper: appMockRender.AppWrapper,
    });

    await waitForNextUpdate();

    expect(spyOnGetCases).toBeCalledWith({
      filterOptions: { ...DEFAULT_FILTER_OPTIONS, owner: [...OWNERS] },
      queryParams: DEFAULT_QUERY_PARAMS,
      signal: abortCtrl.signal,
    });
  });

  it('should set only the available owners when no owner is provided', async () => {
    appMockRender = createAppMockRenderer({ owner: [] });
    const spyOnGetCases = jest.spyOn(api, 'getCases');

    const { waitForNextUpdate } = renderHook(() => useGetCases(), {
      wrapper: appMockRender.AppWrapper,
    });

    await waitForNextUpdate();

    expect(spyOnGetCases).toBeCalledWith({
      filterOptions: { ...DEFAULT_FILTER_OPTIONS, owner: ['cases'] },
      queryParams: DEFAULT_QUERY_PARAMS,
      signal: abortCtrl.signal,
    });
  });

  it('should use the app owner when the filter options do not specify the owner', async () => {
    appMockRender = createAppMockRenderer({ owner: ['observability'] });
    const spyOnGetCases = jest.spyOn(api, 'getCases');

    const { waitForNextUpdate } = renderHook(() => useGetCases(), {
      wrapper: appMockRender.AppWrapper,
    });

    await waitForNextUpdate();

    expect(spyOnGetCases).toBeCalledWith({
      filterOptions: { ...DEFAULT_FILTER_OPTIONS, owner: ['observability'] },
      queryParams: DEFAULT_QUERY_PARAMS,
      signal: abortCtrl.signal,
    });
  });

  it('respects the owner in the filter options if provided', async () => {
    appMockRender = createAppMockRenderer({ owner: ['observability'] });
    const spyOnGetCases = jest.spyOn(api, 'getCases');

    const { waitForNextUpdate } = renderHook(
      () => useGetCases({ filterOptions: { owner: ['my-owner'] } }),
      {
        wrapper: appMockRender.AppWrapper,
      }
    );

    await waitForNextUpdate();

    expect(spyOnGetCases).toBeCalledWith({
      filterOptions: { ...DEFAULT_FILTER_OPTIONS, owner: ['my-owner'] },
      queryParams: DEFAULT_QUERY_PARAMS,
      signal: abortCtrl.signal,
    });
  });
});
