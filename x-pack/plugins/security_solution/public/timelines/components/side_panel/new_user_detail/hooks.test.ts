/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react-hooks';
import type { InstalledIntegration } from '../../../../../common/api/detection_engine/fleet_integrations';
import { TestProviders } from '../../../../common/mock';
import { MANAGED_USER_PACKAGE_NAME } from './constants';
import { useManagedUser } from './hooks';

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
  '../../../../detections/components/rules/related_integrations/use_installed_integrations',
  () => ({
    useInstalledIntegrations: () => mockUseInstalledIntegrations(),
  })
);

describe('useManagedUser', () => {
  it('returns isIntegrationEnabled:true when it finds an enabled integration with the given name', () => {
    mockUseInstalledIntegrations.mockReturnValue({
      data: [makeInstalledIntegration(MANAGED_USER_PACKAGE_NAME, true)],
    });

    const { result } = renderHook(() => useManagedUser('test-userName'), {
      wrapper: TestProviders,
    });

    expect(result.current.isIntegrationEnabled).toBeTruthy();
  });

  it('returns isIntegrationEnabled:false when it does not find an enabled integration with the given name', () => {
    mockUseInstalledIntegrations.mockReturnValue({
      data: [makeInstalledIntegration('fake-name', true)],
    });

    const { result } = renderHook(() => useManagedUser('test-userName'), {
      wrapper: TestProviders,
    });

    expect(result.current.isIntegrationEnabled).toBeFalsy();
  });
});
