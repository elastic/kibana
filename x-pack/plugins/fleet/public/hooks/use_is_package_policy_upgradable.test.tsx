/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react-hooks';

import { useIsPackagePolicyUpgradable } from './use_is_package_policy_upgradable';
import { useGetPackages } from './use_request/epm';

jest.mock('./use_request/epm');

const mockedUseGetPackages = useGetPackages as jest.MockedFunction<typeof useGetPackages>;

describe('useIsPackagePolicyUpgradable', () => {
  beforeEach(() => {
    mockedUseGetPackages.mockReturnValue({
      error: null,
      isInitialRequest: false,
      isLoading: false,
      data: {
        items: [
          {
            status: 'installed',
            savedObject: {
              attributes: {
                name: 'test',
                version: '1.0.0',
              },
            },
          },
        ],
      },
    } as any);
  });
  it('should return true with an upgradable package policy', () => {
    const { result } = renderHook(() => useIsPackagePolicyUpgradable());
    const isUpgradable = result.current.isPackagePolicyUpgradable({
      package: {
        name: 'test',
        version: '0.9.0',
      },
    } as any);
    expect(isUpgradable).toBeTruthy();
  });

  it('should return false with a non upgradable package policy', () => {
    const { result } = renderHook(() => useIsPackagePolicyUpgradable());
    const isUpgradable = result.current.isPackagePolicyUpgradable({
      package: {
        name: 'test',
        version: '1.0.0',
      },
    } as any);
    expect(isUpgradable).toBeFalsy();
  });

  it('should return false with a non installed package', () => {
    const { result } = renderHook(() => useIsPackagePolicyUpgradable());
    const isUpgradable = result.current.isPackagePolicyUpgradable({
      package: {
        name: 'idonotexists',
        version: '1.0.0',
      },
    } as any);
    expect(isUpgradable).toBeFalsy();
  });
});
