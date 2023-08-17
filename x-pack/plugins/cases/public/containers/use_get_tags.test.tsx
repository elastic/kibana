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
import { useGetTags } from './use_get_tags';
import { useToasts } from '../common/lib/kibana';

jest.mock('./api');
jest.mock('../common/lib/kibana');

describe('useGetTags', () => {
  const abortCtrl = new AbortController();
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls getTags api', async () => {
    const spyOnGetTags = jest.spyOn(api, 'getTags');
    const { waitForNextUpdate } = renderHook(() => useGetTags(), {
      wrapper: ({ children }) => <TestProviders>{children}</TestProviders>,
    });
    await waitForNextUpdate();
    expect(spyOnGetTags).toBeCalledWith({
      owner: [SECURITY_SOLUTION_OWNER],
      signal: abortCtrl.signal,
    });
  });

  it('displays and error toast when an error occurs', async () => {
    const addError = jest.fn();
    (useToasts as jest.Mock).mockReturnValue({ addError });
    const spyOnGetTags = jest.spyOn(api, 'getTags');
    spyOnGetTags.mockImplementation(() => {
      throw new Error('Something went wrong');
    });
    const { waitForNextUpdate } = renderHook(() => useGetTags(), {
      wrapper: ({ children }) => <TestProviders>{children}</TestProviders>,
    });
    await waitForNextUpdate();
    expect(addError).toBeCalled();
  });
});
