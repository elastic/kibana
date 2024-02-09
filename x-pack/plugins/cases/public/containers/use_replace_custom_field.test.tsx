/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react-hooks';
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
  const sampleUpdate = {
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

    const { waitForNextUpdate, result } = renderHook(() => useReplaceCustomField(), {
      wrapper: appMockRender.AppWrapper,
    });

    act(() => {
      result.current.mutate(sampleUpdate);
    });

    await waitForNextUpdate();

    expect(queryClientSpy).toHaveBeenCalledWith(casesQueriesKeys.caseView());
    expect(queryClientSpy).toHaveBeenCalledWith(casesQueriesKeys.tags());
  });

  it('calls the api when invoked with the correct parameters', async () => {
    const patchCustomFieldSpy = jest.spyOn(api, 'replaceCustomField');
    const { waitForNextUpdate, result } = renderHook(() => useReplaceCustomField(), {
      wrapper: appMockRender.AppWrapper,
    });

    act(() => {
      result.current.mutate(sampleUpdate);
    });

    await waitForNextUpdate();

    expect(patchCustomFieldSpy).toHaveBeenCalledWith({
      caseId: sampleUpdate.caseId,
      customFieldId: sampleUpdate.customFieldId,
      request: {
        value: sampleUpdate.customFieldValue,
        caseVersion: sampleUpdate.caseVersion,
      },
    });
  });

  it('shows a toast error when the api return an error', async () => {
    jest
      .spyOn(api, 'replaceCustomField')
      .mockRejectedValue(new Error('useUpdateComment: Test error'));

    const { waitForNextUpdate, result } = renderHook(() => useReplaceCustomField(), {
      wrapper: appMockRender.AppWrapper,
    });

    act(() => {
      result.current.mutate(sampleUpdate);
    });

    await waitForNextUpdate();

    expect(addError).toHaveBeenCalled();
  });
});
