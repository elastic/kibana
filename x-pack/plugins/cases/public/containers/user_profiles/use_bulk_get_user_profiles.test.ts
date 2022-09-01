/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react-hooks';
import { useToasts, useKibana } from '../../common/lib/kibana';
import { AppMockRenderer, createAppMockRenderer } from '../../common/mock';
import * as api from './api';
import { useBulkGetUserProfiles } from './use_bulk_get_user_profiles';
import { userProfilesIds } from './api.mock';
import { createStartServicesMock } from '../../common/lib/kibana/kibana_react.mock';

jest.mock('../../common/lib/kibana');
jest.mock('./api');

const useKibanaMock = useKibana as jest.Mock;

describe('useBulkGetUserProfiles', () => {
  const props = {
    uids: userProfilesIds,
  };

  const addSuccess = jest.fn();
  (useToasts as jest.Mock).mockReturnValue({ addSuccess, addError: jest.fn() });

  let appMockRender: AppMockRenderer;

  beforeEach(() => {
    appMockRender = createAppMockRenderer();
    jest.clearAllMocks();
    useKibanaMock.mockReturnValue({
      services: { ...createStartServicesMock() },
    });
  });

  it('does not call bulkGetUserProfiles when security is undefined', async () => {
    useKibanaMock.mockReturnValue({
      services: { ...createStartServicesMock(), security: undefined },
    });

    const spyOnBulkGetUserProfiles = jest.spyOn(api, 'bulkGetUserProfiles');

    const { result, waitFor } = renderHook(() => useBulkGetUserProfiles(props), {
      wrapper: appMockRender.AppWrapper,
    });

    await waitFor(() => result.current.isSuccess);

    expect(spyOnBulkGetUserProfiles).not.toBeCalled();
    expect(result.current.data?.size).toBe(0);
  });

  it('calls bulkGetUserProfiles with correct arguments', async () => {
    const spyOnBulkGetUserProfiles = jest.spyOn(api, 'bulkGetUserProfiles');

    const { result, waitFor } = renderHook(() => useBulkGetUserProfiles(props), {
      wrapper: appMockRender.AppWrapper,
    });

    await waitFor(() => result.current.isSuccess);

    expect(spyOnBulkGetUserProfiles).toBeCalledWith({
      ...props,
      security: expect.anything(),
    });
  });

  it('does not call bulkGetUserProfiles and returns an empty array when the uids is empty', async () => {
    const spyOnBulkGetUserProfiles = jest.spyOn(api, 'bulkGetUserProfiles');

    const { result, waitFor } = renderHook(() => useBulkGetUserProfiles({ uids: [] }), {
      wrapper: appMockRender.AppWrapper,
    });

    await waitFor(() => result.current.isSuccess);

    expect(spyOnBulkGetUserProfiles).not.toBeCalled();
    expect(result.current.data?.size).toBe(0);
  });

  it('shows a toast error message when an error occurs in the response', async () => {
    const spyOnBulkGetUserProfiles = jest.spyOn(api, 'bulkGetUserProfiles');

    spyOnBulkGetUserProfiles.mockImplementation(() => {
      throw new Error('Something went wrong');
    });

    const addError = jest.fn();
    (useToasts as jest.Mock).mockReturnValue({ addSuccess, addError });

    const { result, waitFor } = renderHook(() => useBulkGetUserProfiles(props), {
      wrapper: appMockRender.AppWrapper,
    });

    await waitFor(() => result.current.isError);

    expect(addError).toHaveBeenCalled();
  });
});
