/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react-hooks';
import { useToasts } from '../../common/lib/kibana';
import { AppMockRenderer, createAppMockRenderer } from '../../common/mock';
import * as api from './api';
import { useBulkGetUserProfiles } from './use_bulk_get_user_profiles';
import { userProfilesIds } from './api.mock';

jest.mock('../../common/lib/kibana');
jest.mock('./api');

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
  });

  it('calls bulkGetUserProfiles with correct arguments', async () => {
    const spyOnSuggestUserProfiles = jest.spyOn(api, 'bulkGetUserProfiles');

    const { result, waitFor } = renderHook(() => useBulkGetUserProfiles(props), {
      wrapper: appMockRender.AppWrapper,
    });

    await waitFor(() => result.current.isSuccess);

    expect(spyOnSuggestUserProfiles).toBeCalledWith({
      ...props,
      security: expect.anything(),
    });
  });

  it('shows a toast error message when an error occurs in the response', async () => {
    const spyOnSuggestUserProfiles = jest.spyOn(api, 'bulkGetUserProfiles');

    spyOnSuggestUserProfiles.mockImplementation(() => {
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
