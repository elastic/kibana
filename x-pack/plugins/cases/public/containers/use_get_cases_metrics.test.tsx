/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import * as api from '../api';
import type { AppMockRenderer } from '../common/mock';
import { createAppMockRenderer } from '../common/mock';
import { useGetCasesMetrics } from './use_get_cases_metrics';
import { SECURITY_SOLUTION_OWNER } from '../../common/constants';
import { useToasts } from '../common/lib/kibana';
import { CaseMetricsFeature } from '../../common/types/api';

jest.mock('../api');
jest.mock('../common/lib/kibana');

describe('useGetCasesMetrics', () => {
  const abortCtrl = new AbortController();
  const addSuccess = jest.fn();
  const addError = jest.fn();

  (useToasts as jest.Mock).mockReturnValue({ addSuccess, addError });

  let appMockRender: AppMockRenderer;

  beforeEach(() => {
    appMockRender = createAppMockRenderer();
    jest.clearAllMocks();
  });

  it('calls the api when invoked with the correct parameters', async () => {
    const spy = jest.spyOn(api, 'getCasesMetrics');
    const { waitForNextUpdate } = renderHook(() => useGetCasesMetrics(), {
      wrapper: appMockRender.AppWrapper,
    });

    await waitForNextUpdate();

    expect(spy).toHaveBeenCalledWith({
      http: expect.anything(),
      signal: abortCtrl.signal,
      query: { owner: [SECURITY_SOLUTION_OWNER], features: [CaseMetricsFeature.MTTR] },
    });
  });

  it('shows a toast error when the api return an error', async () => {
    jest
      .spyOn(api, 'getCasesMetrics')
      .mockRejectedValue(new Error('useGetCasesMetrics: Test error'));

    const { waitForNextUpdate } = renderHook(() => useGetCasesMetrics(), {
      wrapper: appMockRender.AppWrapper,
    });

    await waitForNextUpdate();

    expect(addError).toHaveBeenCalled();
  });
});
