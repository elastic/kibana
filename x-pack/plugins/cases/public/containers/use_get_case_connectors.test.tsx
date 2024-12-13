/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { waitFor, renderHook } from '@testing-library/react';
import * as api from './api';
import type { AppMockRenderer } from '../common/mock';
import { createAppMockRenderer } from '../common/mock';
import { useToasts } from '../common/lib/kibana';
import { useGetCaseConnectors } from './use_get_case_connectors';

jest.mock('./api');
jest.mock('../common/lib/kibana');

describe('useGetCaseConnectors', () => {
  const caseId = 'test-id';
  const abortCtrl = new AbortController();
  const addSuccess = jest.fn();
  (useToasts as jest.Mock).mockReturnValue({ addSuccess, addError: jest.fn() });

  let appMockRender: AppMockRenderer;

  beforeEach(() => {
    appMockRender = createAppMockRenderer();
    jest.clearAllMocks();
  });

  it('calls getCaseConnectors with correct arguments', async () => {
    const spyOnGetCases = jest.spyOn(api, 'getCaseConnectors');
    renderHook(() => useGetCaseConnectors(caseId), {
      wrapper: appMockRender.AppWrapper,
    });

    await waitFor(() => {
      expect(spyOnGetCases).toHaveBeenCalled();
    });

    expect(spyOnGetCases).toBeCalledWith('test-id', abortCtrl.signal);
  });

  it('shows a toast error message when an error occurs in the response', async () => {
    const spyOnGetCases = jest.spyOn(api, 'getCaseConnectors');
    spyOnGetCases.mockImplementation(() => {
      throw new Error('Something went wrong');
    });

    const addError = jest.fn();
    (useToasts as jest.Mock).mockReturnValue({ addSuccess, addError });

    renderHook(() => useGetCaseConnectors(caseId), {
      wrapper: appMockRender.AppWrapper,
    });

    await waitFor(() => {
      expect(addError).toHaveBeenCalled();
    });
  });
});
