/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react-hooks';
import type { Integration } from '../../../../../common/api/detection_engine';
import { TestProviders } from '../../../../common/mock';
import { ENTRA_ID_PACKAGE_NAME } from '../constants';
import { useManagedUser } from './use_managed_user';

const makeIntegration = (pkgName = 'testPkg', isEnabled = false): Integration => ({
  package_name: pkgName,
  package_title: '',
  latest_package_version: '',
  installed_package_version: '',
  integration_name: '',
  integration_title: '',
  is_installed: true,
  is_enabled: isEnabled,
});

const mockUseIntegrations = jest.fn().mockReturnValue({
  data: [],
});

jest.mock('../../../../detections/components/rules/related_integrations/use_integrations', () => ({
  useIntegrations: () => mockUseIntegrations(),
}));

jest.mock('../../../../common/hooks/use_space_id', () => ({
  useSpaceId: () => 'test-space-id',
}));

const mockUseIsExperimentalFeatureEnabled = jest.fn().mockReturnValue(true);

jest.mock('../../../../common/hooks/use_experimental_features', () => ({
  useIsExperimentalFeatureEnabled: () => mockUseIsExperimentalFeatureEnabled(),
}));

const mockSearch = jest.fn().mockReturnValue({
  data: [],
});

const useSearchStrategyDefaultResponse = {
  loading: false,
  result: { users: [] },
  search: (...params: unknown[]) => mockSearch(...params),
  refetch: () => {},
  inspect: {},
};

const mockUseSearchStrategy = jest.fn().mockReturnValue(useSearchStrategyDefaultResponse);

jest.mock('../../../../common/containers/use_search_strategy', () => ({
  useSearchStrategy: () => mockUseSearchStrategy(),
}));

describe('useManagedUser', () => {
  beforeEach(() => {
    mockSearch.mockClear();
  });
  it('returns isIntegrationEnabled:true when it finds an enabled integration with the given name', () => {
    mockUseIntegrations.mockReturnValue({
      data: [makeIntegration(ENTRA_ID_PACKAGE_NAME, true)],
    });

    const { result } = renderHook(() => useManagedUser('test-userName', undefined, false), {
      wrapper: TestProviders,
    });

    expect(result.current.isIntegrationEnabled).toBeTruthy();
  });

  it('returns isIntegrationEnabled:false when it does not find an enabled integration with the given name', () => {
    mockUseIntegrations.mockReturnValue({
      data: [makeIntegration('fake-name', true)],
    });

    const { result } = renderHook(() => useManagedUser('test-userName', undefined, false), {
      wrapper: TestProviders,
    });

    expect(result.current.isIntegrationEnabled).toBeFalsy();
  });

  it('should search', () => {
    renderHook(() => useManagedUser('test-userName', undefined, false), {
      wrapper: TestProviders,
    });

    expect(mockSearch).toHaveBeenCalled();
  });

  it('should not search while observed user is loading', () => {
    renderHook(() => useManagedUser('test-userName', undefined, true), {
      wrapper: TestProviders,
    });

    expect(mockSearch).not.toHaveBeenCalled();
  });

  it('should search by email if the field is available', () => {
    const email = ['test@email.com'];
    renderHook(() => useManagedUser('test-userName', email, false), {
      wrapper: TestProviders,
    });

    expect(mockSearch).toBeCalledWith(
      expect.objectContaining({
        userEmail: email,
      })
    );
  });

  it('should not search if the feature is disabled', () => {
    mockUseIsExperimentalFeatureEnabled.mockReturnValue(false);
    renderHook(() => useManagedUser('test-userName', undefined, false), {
      wrapper: TestProviders,
    });

    expect(mockSearch).not.toHaveBeenCalled();
  });

  it('should return loading false when the feature is disabled', () => {
    mockUseIsExperimentalFeatureEnabled.mockReturnValue(false);
    mockUseIntegrations.mockReturnValue({
      data: [],
      isLoading: true,
    });
    mockUseSearchStrategy.mockReturnValue({ ...useSearchStrategyDefaultResponse, loading: true });

    const { result } = renderHook(() => useManagedUser('test-userName', undefined, false), {
      wrapper: TestProviders,
    });

    expect(result.current.isLoading).toBeFalsy();
  });
});
