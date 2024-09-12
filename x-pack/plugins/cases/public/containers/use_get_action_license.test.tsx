/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, waitFor } from '@testing-library/react';
import * as api from './api';
import { useGetActionLicense } from './use_get_action_license';
import type { AppMockRenderer } from '../common/mock';
import { createAppMockRenderer } from '../common/mock';
import { useToasts } from '../common/lib/kibana';

jest.mock('./api');
jest.mock('../common/lib/kibana');

describe('useGetActionLicense', () => {
  const abortCtrl = new AbortController();
  let appMockRenderer: AppMockRenderer;
  beforeEach(() => {
    jest.clearAllMocks();
    appMockRenderer = createAppMockRenderer();
  });

  it('calls getActionLicense with correct arguments', async () => {
    const spyOnGetActionLicense = jest.spyOn(api, 'getActionLicense');
    renderHook(() => useGetActionLicense(), {
      wrapper: appMockRenderer.AppWrapper,
    });

    await waitFor(() => null);
    expect(spyOnGetActionLicense).toBeCalledWith(abortCtrl.signal);
  });

  it('unhappy path', async () => {
    const addError = jest.fn();

    (useToasts as jest.Mock).mockReturnValue({ addError });
    const spyOnGetActionLicense = jest.spyOn(api, 'getActionLicense');
    spyOnGetActionLicense.mockImplementation(() => {
      throw new Error('Something went wrong');
    });

    renderHook(() => useGetActionLicense(), {
      wrapper: appMockRenderer.AppWrapper,
    });
    await waitFor(() => null);

    expect(addError).toHaveBeenCalled();
  });
});
