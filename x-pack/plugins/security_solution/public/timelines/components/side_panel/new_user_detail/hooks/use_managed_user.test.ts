/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react-hooks';
import type { InstalledIntegration } from '../../../../../../common/api/detection_engine/fleet_integrations';
import { TestProviders } from '../../../../../common/mock';
import { ENTRA_ID_PACKAGE_NAME } from '../constants';
import { useManagedUser } from './use_managed_user';
import type { ObserverUser } from './use_observed_user';

const makeInstalledIntegration = (
  pkgName = 'testPkg',
  isEnabled = false
): InstalledIntegration => ({
  package_name: pkgName,
  package_title: '',
  package_version: '',
  integration_name: '',
  integration_title: '',
  is_enabled: isEnabled,
});

const mockUseInstalledIntegrations = jest.fn().mockReturnValue({
  data: [],
});

jest.mock(
  '../../../../../detections/components/rules/related_integrations/use_installed_integrations',
  () => ({
    useInstalledIntegrations: () => mockUseInstalledIntegrations(),
  })
);

jest.mock('../../../../../common/hooks/use_space_id', () => ({
  useSpaceId: () => 'test-space-id',
}));

const mockSearch = jest.fn().mockReturnValue({
  data: [],
});

jest.mock('../../../../../common/containers/use_search_strategy', () => ({
  useSearchStrategy: () => ({
    loading: false,
    result: { users: [] },
    search: (...params: unknown[]) => mockSearch(...params),
    refetch: () => {},
    inspect: {},
  }),
}));

const observedUser: ObserverUser = {
  isLoading: false,
  details: {},
  firstSeen: {
    date: undefined,
    isLoading: false,
  },
  lastSeen: {
    date: undefined,
    isLoading: false,
  },
};

describe('useManagedUser', () => {
  beforeEach(() => {
    mockSearch.mockClear();
  });
  it('returns isIntegrationEnabled:true when it finds an enabled integration with the given name', () => {
    mockUseInstalledIntegrations.mockReturnValue({
      data: [makeInstalledIntegration(ENTRA_ID_PACKAGE_NAME, true)],
    });

    const { result } = renderHook(() => useManagedUser('test-userName', observedUser), {
      wrapper: TestProviders,
    });

    expect(result.current.isIntegrationEnabled).toBeTruthy();
  });

  it('returns isIntegrationEnabled:false when it does not find an enabled integration with the given name', () => {
    mockUseInstalledIntegrations.mockReturnValue({
      data: [makeInstalledIntegration('fake-name', true)],
    });

    const { result } = renderHook(() => useManagedUser('test-userName', observedUser), {
      wrapper: TestProviders,
    });

    expect(result.current.isIntegrationEnabled).toBeFalsy();
  });

  it('should search', () => {
    renderHook(() => useManagedUser('test-userName', observedUser), {
      wrapper: TestProviders,
    });

    expect(mockSearch).toHaveBeenCalled();
  });

  it('should not search while observed user is loading', () => {
    renderHook(() => useManagedUser('test-userName', { ...observedUser, isLoading: true }), {
      wrapper: TestProviders,
    });

    expect(mockSearch).not.toHaveBeenCalled();
  });

  it('should search by email if the field is available', () => {
    const email = ['test@email.com'];
    renderHook(
      () =>
        useManagedUser('test-userName', {
          ...observedUser,
          details: { user: { email } },
        }),
      {
        wrapper: TestProviders,
      }
    );

    expect(mockSearch).toBeCalledWith(
      expect.objectContaining({
        userEmail: email,
      })
    );
  });
});
