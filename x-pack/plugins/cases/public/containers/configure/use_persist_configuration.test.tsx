/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react-hooks';

import { usePersistConfiguration } from './use_persist_configuration';
import * as api from './api';
import { useToasts } from '../../common/lib/kibana';
import type { AppMockRenderer } from '../../common/mock';
import { createAppMockRenderer } from '../../common/mock';
import { ConnectorTypes } from '../../../common';
import { casesQueriesKeys } from '../constants';

jest.mock('./api');
jest.mock('../../common/lib/kibana');

const useToastMock = useToasts as jest.Mock;

describe('useCreateAttachments', () => {
  const addError = jest.fn();
  const addSuccess = jest.fn();

  useToastMock.mockReturnValue({
    addError,
    addSuccess,
  });

  const request = {
    closureType: 'close-by-user' as const,
    connector: {
      fields: null,
      id: 'none',
      name: 'none',
      type: ConnectorTypes.none,
    },
    customFields: [],
    version: '',
    id: '',
  };

  let appMockRender: AppMockRenderer;

  beforeEach(() => {
    appMockRender = createAppMockRenderer();
    jest.clearAllMocks();
  });

  it('calls postCaseConfigure when the id is empty', async () => {
    const spyPost = jest.spyOn(api, 'postCaseConfigure');
    const spyPatch = jest.spyOn(api, 'patchCaseConfigure');

    const { waitForNextUpdate, result } = renderHook(() => usePersistConfiguration(), {
      wrapper: appMockRender.AppWrapper,
    });

    act(() => {
      result.current.mutate({ ...request, version: 'test' });
    });

    await waitForNextUpdate();

    expect(spyPatch).not.toHaveBeenCalled();
    expect(spyPost).toHaveBeenCalledWith({
      closure_type: 'close-by-user',
      connector: { fields: null, id: 'none', name: 'none', type: '.none' },
      customFields: [],
      owner: 'securitySolution',
    });
  });

  it('calls postCaseConfigure when the version is empty', async () => {
    const spyPost = jest.spyOn(api, 'postCaseConfigure');
    const spyPatch = jest.spyOn(api, 'patchCaseConfigure');

    const { waitForNextUpdate, result } = renderHook(() => usePersistConfiguration(), {
      wrapper: appMockRender.AppWrapper,
    });

    act(() => {
      result.current.mutate({ ...request, id: 'test' });
    });

    await waitForNextUpdate();

    expect(spyPatch).not.toHaveBeenCalled();
    expect(spyPost).toHaveBeenCalledWith({
      closure_type: 'close-by-user',
      connector: { fields: null, id: 'none', name: 'none', type: '.none' },
      customFields: [],
      owner: 'securitySolution',
    });
  });

  it('calls patchCaseConfigure when the id and the version are not empty', async () => {
    const spyPost = jest.spyOn(api, 'postCaseConfigure');
    const spyPatch = jest.spyOn(api, 'patchCaseConfigure');

    const { waitForNextUpdate, result } = renderHook(() => usePersistConfiguration(), {
      wrapper: appMockRender.AppWrapper,
    });

    act(() => {
      result.current.mutate({ ...request, id: 'test-id', version: 'test-version' });
    });

    await waitForNextUpdate();

    expect(spyPost).not.toHaveBeenCalled();
    expect(spyPatch).toHaveBeenCalledWith('test-id', {
      closure_type: 'close-by-user',
      connector: { fields: null, id: 'none', name: 'none', type: '.none' },
      customFields: [],
      version: 'test-version',
    });
  });

  it('invalidates the queries correctly', async () => {
    const queryClientSpy = jest.spyOn(appMockRender.queryClient, 'invalidateQueries');
    const { waitForNextUpdate, result } = renderHook(() => usePersistConfiguration(), {
      wrapper: appMockRender.AppWrapper,
    });

    act(() => {
      result.current.mutate(request);
    });

    await waitForNextUpdate();

    expect(queryClientSpy).toHaveBeenCalledWith(casesQueriesKeys.configuration({}));
  });

  it('shows the success toaster', async () => {
    const { waitForNextUpdate, result } = renderHook(() => usePersistConfiguration(), {
      wrapper: appMockRender.AppWrapper,
    });

    act(() => {
      result.current.mutate(request);
    });

    await waitForNextUpdate();

    expect(addSuccess).toHaveBeenCalled();
  });

  it('shows a toast error when the api return an error', async () => {
    jest
      .spyOn(api, 'postCaseConfigure')
      .mockRejectedValue(new Error('useCreateAttachments: Test error'));

    const { waitForNextUpdate, result } = renderHook(() => usePersistConfiguration(), {
      wrapper: appMockRender.AppWrapper,
    });

    act(() => {
      result.current.mutate(request);
    });

    await waitForNextUpdate();

    expect(addError).toHaveBeenCalled();
  });
});
