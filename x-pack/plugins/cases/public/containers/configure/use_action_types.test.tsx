/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react-hooks';
import * as api from './api';
import type { AppMockRenderer } from '../../common/mock';
import { createAppMockRenderer } from '../../common/mock';
import { useGetActionTypes } from './use_action_types';
import { useToasts } from '../../common/lib/kibana';

jest.mock('./api');
jest.mock('../../common/lib/kibana');

describe('useActionTypes', () => {
  let appMockRenderer: AppMockRenderer;
  beforeEach(() => {
    jest.clearAllMocks();
    appMockRenderer = createAppMockRenderer();
  });

  it('should fetch action types', async () => {
    const spy = jest.spyOn(api, 'fetchActionTypes');

    renderHook(() => useGetActionTypes(), {
      wrapper: appMockRenderer.AppWrapper,
    });

    expect(spy).toHaveBeenCalledWith({ signal: expect.any(AbortSignal) });
  });

  it('should show a toast error message if failed to fetch', async () => {
    const spyOnFetchActionTypes = jest.spyOn(api, 'fetchActionTypes');

    spyOnFetchActionTypes.mockRejectedValue(() => {
      throw new Error('Something went wrong');
    });

    const addErrorMock = jest.fn();

    (useToasts as jest.Mock).mockReturnValue({ addError: addErrorMock });

    const { waitForNextUpdate } = renderHook(() => useGetActionTypes(), {
      wrapper: appMockRenderer.AppWrapper,
    });
    await waitForNextUpdate({ timeout: 2000 });
    expect(addErrorMock).toHaveBeenCalled();
  });
});
