/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderHook, act } from '@testing-library/react-hooks';
import { SingleCaseMetricsFeature } from '../../common/ui';
import { useGetCaseMetrics } from './use_get_case_metrics';
import { basicCase } from './mock';
import * as api from './api';
import { TestProviders } from '../common/mock';
import { useToasts } from '../common/lib/kibana';

jest.mock('./api');
jest.mock('../common/lib/kibana');

const wrapper: React.FC<string> = ({ children }) => <TestProviders>{children}</TestProviders>;

describe('useGetCaseMetrics', () => {
  const abortCtrl = new AbortController();
  const features: SingleCaseMetricsFeature[] = ['alerts.count'];

  beforeEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  it('calls getSingleCaseMetrics with correct arguments', async () => {
    const spyOnGetCaseMetrics = jest.spyOn(api, 'getSingleCaseMetrics');
    await act(async () => {
      const { waitForNextUpdate } = renderHook(() => useGetCaseMetrics(basicCase.id, features), {
        wrapper,
      });
      await waitForNextUpdate();
      expect(spyOnGetCaseMetrics).toBeCalledWith(basicCase.id, features, abortCtrl.signal);
    });
  });

  it('shows an error toast when getSingleCaseMetrics throws', async () => {
    const addError = jest.fn();
    (useToasts as jest.Mock).mockReturnValue({ addError });

    const spyOnGetCaseMetrics = jest.spyOn(api, 'getSingleCaseMetrics');
    spyOnGetCaseMetrics.mockImplementation(() => {
      throw new Error('Something went wrong');
    });

    const { waitForNextUpdate } = renderHook(() => useGetCaseMetrics(basicCase.id, features), {
      wrapper,
    });
    await waitForNextUpdate();
    expect(spyOnGetCaseMetrics).toBeCalledWith(basicCase.id, features, abortCtrl.signal);
    expect(addError).toHaveBeenCalled();
  });
});
