/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useToasts, useKibana } from '../../common/lib/kibana';
import { createStartServicesMock } from '../../common/lib/kibana/kibana_react.mock';
import type { AppMockRenderer } from '../../common/mock';
import { createAppMockRenderer } from '../../common/mock';
import * as api from './api';
import { useGetCurrentUserProfile } from './use_get_current_user_profile';

jest.mock('../../common/lib/kibana');
jest.mock('./api');

const useKibanaMock = useKibana as jest.Mock;

describe('useGetCurrentUserProfile', () => {
  const addSuccess = jest.fn();
  (useToasts as jest.Mock).mockReturnValue({ addSuccess, addError: jest.fn() });

  let appMockRender: AppMockRenderer;

  beforeEach(() => {
    jest.clearAllMocks();

    appMockRender = createAppMockRenderer();
    useKibanaMock.mockReturnValue({
      services: { ...createStartServicesMock() },
    });
  });

  it('calls getCurrentUserProfile with correct arguments', async () => {
    const spyOnGetCurrentUserProfile = jest.spyOn(api, 'getCurrentUserProfile');

    const { waitFor } = renderHook(() => useGetCurrentUserProfile(), {
      wrapper: appMockRender.AppWrapper,
    });

    await waitFor(() => {
      expect(spyOnGetCurrentUserProfile).toBeCalled();
    });

    expect(spyOnGetCurrentUserProfile).toBeCalledWith({
      security: expect.anything(),
    });
  });

  it('shows a toast error message when an error occurs in the response', async () => {
    const spyOnGetCurrentUserProfile = jest.spyOn(api, 'getCurrentUserProfile');

    spyOnGetCurrentUserProfile.mockImplementation(() => {
      throw new Error('Something went wrong');
    });

    const addError = jest.fn();
    (useToasts as jest.Mock).mockReturnValue({ addSuccess, addError });

    const { waitFor } = renderHook(() => useGetCurrentUserProfile(), {
      wrapper: appMockRender.AppWrapper,
    });

    await waitFor(() => {
      expect(addError).toHaveBeenCalled();
    });
  });

  it('does not show a toast error message when a 404 error is returned', async () => {
    const spyOnGetCurrentUserProfile = jest.spyOn(api, 'getCurrentUserProfile');

    spyOnGetCurrentUserProfile.mockImplementation(() => {
      throw new MockServerError('profile not found', 404);
    });

    const addError = jest.fn();
    (useToasts as jest.Mock).mockReturnValue({ addSuccess, addError });

    const { waitFor } = renderHook(() => useGetCurrentUserProfile(), {
      wrapper: appMockRender.AppWrapper,
    });

    await waitFor(() => {
      expect(addError).not.toHaveBeenCalled();
    });
  });
});

class MockServerError extends Error {
  public readonly body: {
    statusCode: number;
  };

  constructor(message?: string, statusCode: number = 200) {
    super(message);
    this.name = this.constructor.name;
    this.body = { statusCode };
  }
}
