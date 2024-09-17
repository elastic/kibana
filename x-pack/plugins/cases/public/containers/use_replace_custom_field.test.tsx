/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { basicCase } from './mock';
import * as api from './api';
import type { AppMockRenderer } from '../common/mock';
import { createAppMockRenderer } from '../common/mock';
import { useToasts } from '../common/lib/kibana';
import { casesQueriesKeys } from './constants';
import { useReplaceCustomField } from './use_replace_custom_field';

jest.mock('./api');
jest.mock('../common/lib/kibana');

describe('useReplaceCustomField', () => {
  const sampleData = {
    caseId: basicCase.id,
    customFieldId: 'test_key_1',
    customFieldValue: 'this is an updated custom field',
    caseVersion: basicCase.version,
  };

  const addSuccess = jest.fn();
  const addError = jest.fn();
  (useToasts as jest.Mock).mockReturnValue({ addSuccess, addError });

  let appMockRender: AppMockRenderer;

  beforeEach(() => {
    jest.clearAllMocks();
    appMockRender = createAppMockRenderer();
  });

  it('replace a customField and refresh the case page', async () => {
    const queryClientSpy = jest.spyOn(appMockRender.queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useReplaceCustomField(), {
      wrapper: appMockRender.AppWrapper,
    });

    act(() => {
      result.current.mutate(sampleData);
    });

    await waitFor(() => null);

    expect(queryClientSpy).toHaveBeenCalledWith(casesQueriesKeys.caseView());
    expect(queryClientSpy).toHaveBeenCalledWith(casesQueriesKeys.tags());
  });

  it('calls the api when invoked with the correct parameters', async () => {
    const patchCustomFieldSpy = jest.spyOn(api, 'replaceCustomField');
    const { result } = renderHook(() => useReplaceCustomField(), {
      wrapper: appMockRender.AppWrapper,
    });

    act(() => {
      result.current.mutate(sampleData);
    });

    await waitFor(() => null);

    expect(patchCustomFieldSpy).toHaveBeenCalledWith({
      caseId: sampleData.caseId,
      customFieldId: sampleData.customFieldId,
      request: {
        value: sampleData.customFieldValue,
        caseVersion: sampleData.caseVersion,
      },
    });
  });

  it('calls the api when invoked with the correct parameters of toggle field', async () => {
    const newData = {
      caseId: basicCase.id,
      customFieldId: 'test_key_2',
      customFieldValue: false,
      caseVersion: basicCase.version,
    };
    const patchCustomFieldSpy = jest.spyOn(api, 'replaceCustomField');
    const { result } = renderHook(() => useReplaceCustomField(), {
      wrapper: appMockRender.AppWrapper,
    });

    act(() => {
      result.current.mutate(newData);
    });

    await waitFor(() => null);

    expect(patchCustomFieldSpy).toHaveBeenCalledWith({
      caseId: newData.caseId,
      customFieldId: newData.customFieldId,
      request: {
        value: newData.customFieldValue,
        caseVersion: newData.caseVersion,
      },
    });
  });

  it('calls the api when invoked with the correct parameters with null value', async () => {
    const newData = {
      caseId: basicCase.id,
      customFieldId: 'test_key_3',
      customFieldValue: null,
      caseVersion: basicCase.version,
    };
    const patchCustomFieldSpy = jest.spyOn(api, 'replaceCustomField');
    const { result } = renderHook(() => useReplaceCustomField(), {
      wrapper: appMockRender.AppWrapper,
    });

    act(() => {
      result.current.mutate(newData);
    });

    await waitFor(() => null);

    expect(patchCustomFieldSpy).toHaveBeenCalledWith({
      caseId: newData.caseId,
      customFieldId: newData.customFieldId,
      request: {
        value: newData.customFieldValue,
        caseVersion: newData.caseVersion,
      },
    });
  });

  it('shows a toast error when the api return an error', async () => {
    jest
      .spyOn(api, 'replaceCustomField')
      .mockRejectedValue(new Error('useUpdateComment: Test error'));

    const { result } = renderHook(() => useReplaceCustomField(), {
      wrapper: appMockRender.AppWrapper,
    });

    act(() => {
      result.current.mutate(sampleData);
    });

    await waitFor(() => null);

    expect(addError).toHaveBeenCalled();
  });
});
