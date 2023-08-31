/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderHook } from '@testing-library/react-hooks';
import * as api from './api';
import { TestProviders } from '../common/mock';
import { SECURITY_SOLUTION_OWNER } from '../../common/constants';
import { useGetCategories } from './use_get_categories';
import { useToasts } from '../common/lib/kibana';

jest.mock('./api');
jest.mock('../common/lib/kibana');

describe('useGetCategories', () => {
  const abortCtrl = new AbortController();
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls getCategories api', async () => {
    const spyOnGetCategories = jest.spyOn(api, 'getCategories');
    const { waitForNextUpdate } = renderHook(() => useGetCategories(), {
      wrapper: ({ children }) => <TestProviders>{children}</TestProviders>,
    });

    await waitForNextUpdate();

    expect(spyOnGetCategories).toBeCalledWith({
      signal: abortCtrl.signal,
      owner: [SECURITY_SOLUTION_OWNER],
    });
  });

  it('displays an error toast when an error occurs', async () => {
    const spyOnGetCategories = jest.spyOn(api, 'getCategories');
    spyOnGetCategories.mockImplementation(() => {
      throw new Error('Something went wrong');
    });

    const addError = jest.fn();
    (useToasts as jest.Mock).mockReturnValue({ addError });

    const { waitForNextUpdate } = renderHook(() => useGetCategories(), {
      wrapper: ({ children }) => <TestProviders>{children}</TestProviders>,
    });

    await waitForNextUpdate();

    expect(addError).toBeCalled();
  });
});
