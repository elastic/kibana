/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useSuggestUsers } from './use_suggest_users';

import * as api from './api';
import { mockUserProfiles } from './mock';
import { useAppToasts } from '../../hooks/use_app_toasts';
import { useAppToastsMock } from '../../hooks/use_app_toasts.mock';
import { TestProviders } from '../../mock';

jest.mock('./api');
jest.mock('../../hooks/use_app_toasts');

describe('useSuggestUsers hook', () => {
  let appToastsMock: jest.Mocked<ReturnType<typeof useAppToastsMock.create>>;
  beforeEach(() => {
    jest.clearAllMocks();
    appToastsMock = useAppToastsMock.create();
    (useAppToasts as jest.Mock).mockReturnValue(appToastsMock);
  });

  it('returns an array of userProfiles', async () => {
    const spyOnUserProfiles = jest.spyOn(api, 'suggestUsers');
    const { result, waitForNextUpdate } = renderHook(() => useSuggestUsers({ searchTerm: '' }), {
      wrapper: TestProviders,
    });
    await waitForNextUpdate();
    expect(spyOnUserProfiles).toHaveBeenCalledTimes(1);
    expect(result.current.isLoading).toEqual(false);
    expect(result.current.data).toEqual(mockUserProfiles);
  });
});
