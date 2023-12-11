/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { epmRouteService } from '@kbn/fleet-plugin/common';
import { renderHook } from '@testing-library/react-hooks';
import { useKibana, KibanaServices } from '../../../common/lib/kibana';
import { TestProviders } from '../../../common/mock';
import { useUpgradeSecurityPackages } from './use_upgrade_security_packages';

jest.mock('../../../common/components/user_privileges', () => {
  return {
    useUserPrivileges: jest.fn().mockReturnValue({
      endpointPrivileges: {
        canAccessFleet: true,
      },
    }),
  };
});
jest.mock('../../../common/lib/kibana');

const mockGetPrebuiltRulesPackageVersion =
  KibanaServices.getPrebuiltRulesPackageVersion as jest.Mock;
const mockGetKibanaVersion = KibanaServices.getKibanaVersion as jest.Mock;
const mockGetKibanaBranch = KibanaServices.getKibanaBranch as jest.Mock;
const mockBuildFlavor = KibanaServices.getBuildFlavor as jest.Mock;
const useKibanaMock = useKibana as jest.MockedFunction<typeof useKibana>;

describe('When using the `useUpgradeSecurityPackages()` hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should call fleet setup first via `isInitialized()` and then send upgrade request', async () => {
    const { waitFor } = renderHook(() => useUpgradeSecurityPackages(), {
      wrapper: TestProviders,
    });

    expect(useKibanaMock().services.fleet?.isInitialized).toHaveBeenCalled();
    expect(useKibanaMock().services.http.post).not.toHaveBeenCalled();

    await waitFor(() => (useKibanaMock().services.http.post as jest.Mock).mock.calls.length > 0);

    expect(useKibanaMock().services.http.post).toHaveBeenCalledWith(
      `${epmRouteService.getBulkInstallPath()}`,
      expect.objectContaining({
        body: '{"packages":["endpoint","security_detection_engine"]}',
      })
    );
  });

  it('should send upgrade request with prerelease:false if in serverless', async () => {
    mockGetKibanaVersion.mockReturnValue('8.0.0');
    mockGetKibanaBranch.mockReturnValue('main');
    mockBuildFlavor.mockReturnValue('serverless');

    const { waitFor } = renderHook(() => useUpgradeSecurityPackages(), {
      wrapper: TestProviders,
    });

    await waitFor(() => (useKibanaMock().services.http.post as jest.Mock).mock.calls.length > 0);

    expect(useKibanaMock().services.http.post).toHaveBeenCalledWith(
      `${epmRouteService.getBulkInstallPath()}`,
      expect.objectContaining({
        body: '{"packages":["endpoint","security_detection_engine"]}',
        query: expect.objectContaining({ prerelease: false }),
      })
    );
  });

  it('should send upgrade request with prerelease:false if in serverless SNAPSHOT', async () => {
    mockGetKibanaVersion.mockReturnValue('8.0.0-SNAPSHOT');
    mockGetKibanaBranch.mockReturnValue('main');
    mockBuildFlavor.mockReturnValue('serverless');

    const { waitFor } = renderHook(() => useUpgradeSecurityPackages(), {
      wrapper: TestProviders,
    });

    await waitFor(() => (useKibanaMock().services.http.post as jest.Mock).mock.calls.length > 0);

    expect(useKibanaMock().services.http.post).toHaveBeenCalledWith(
      `${epmRouteService.getBulkInstallPath()}`,
      expect.objectContaining({
        body: '{"packages":["endpoint","security_detection_engine"]}',
        query: expect.objectContaining({ prerelease: false }),
      })
    );
  });

  it('should send upgrade request with prerelease:false if build does not include `-SNAPSHOT`', async () => {
    mockGetKibanaVersion.mockReturnValue('8.0.0');
    mockGetKibanaBranch.mockReturnValue('release');
    mockBuildFlavor.mockReturnValue('traditional');

    const { waitFor } = renderHook(() => useUpgradeSecurityPackages(), {
      wrapper: TestProviders,
    });

    await waitFor(() => (useKibanaMock().services.http.post as jest.Mock).mock.calls.length > 0);

    expect(useKibanaMock().services.http.post).toHaveBeenCalledWith(
      `${epmRouteService.getBulkInstallPath()}`,
      expect.objectContaining({
        body: '{"packages":["endpoint","security_detection_engine"]}',
        query: expect.objectContaining({ prerelease: false }),
      })
    );
  });

  it('should send upgrade request with prerelease:true if not serverless and branch is `main` AND build includes `-SNAPSHOT`', async () => {
    mockGetKibanaVersion.mockReturnValue('8.0.0-SNAPSHOT');
    mockGetKibanaBranch.mockReturnValue('main');
    mockBuildFlavor.mockReturnValue('traditional');

    const { waitFor } = renderHook(() => useUpgradeSecurityPackages(), {
      wrapper: TestProviders,
    });

    await waitFor(() => (useKibanaMock().services.http.post as jest.Mock).mock.calls.length > 0);

    expect(useKibanaMock().services.http.post).toHaveBeenCalledWith(
      `${epmRouteService.getBulkInstallPath()}`,
      expect.objectContaining({
        body: '{"packages":["endpoint","security_detection_engine"]}',
        query: expect.objectContaining({ prerelease: true }),
      })
    );
  });

  it('should send upgrade request with prerelease:true if branch is `release` and build includes `-SNAPSHOT`', async () => {
    mockGetKibanaVersion.mockReturnValue('8.0.0-SNAPSHOT');
    mockGetKibanaBranch.mockReturnValue('release');
    mockBuildFlavor.mockReturnValue('traditional');

    const { waitFor } = renderHook(() => useUpgradeSecurityPackages(), {
      wrapper: TestProviders,
    });

    await waitFor(() => (useKibanaMock().services.http.post as jest.Mock).mock.calls.length > 0);

    expect(useKibanaMock().services.http.post).toHaveBeenCalledWith(
      `${epmRouteService.getBulkInstallPath()}`,
      expect.objectContaining({
        body: '{"packages":["endpoint","security_detection_engine"]}',
        query: expect.objectContaining({ prerelease: true }),
      })
    );
  });

  it('should send upgrade request with prerelease:true if branch is `main` and build does not include `-SNAPSHOT`', async () => {
    mockGetKibanaVersion.mockReturnValue('8.0.0');
    mockGetKibanaBranch.mockReturnValue('main');
    mockBuildFlavor.mockReturnValue('traditional');

    const { waitFor } = renderHook(() => useUpgradeSecurityPackages(), {
      wrapper: TestProviders,
    });

    await waitFor(() => (useKibanaMock().services.http.post as jest.Mock).mock.calls.length > 0);

    expect(useKibanaMock().services.http.post).toHaveBeenCalledWith(
      `${epmRouteService.getBulkInstallPath()}`,
      expect.objectContaining({
        body: '{"packages":["endpoint","security_detection_engine"]}',
        query: expect.objectContaining({ prerelease: true }),
      })
    );
  });

  it('should send separate upgrade requests if prebuiltRulesPackageVersion is provided', async () => {
    mockGetPrebuiltRulesPackageVersion.mockReturnValue('8.2.1');

    const { waitFor } = renderHook(() => useUpgradeSecurityPackages(), {
      wrapper: TestProviders,
    });

    await waitFor(() => (useKibanaMock().services.http.post as jest.Mock).mock.calls.length > 0);

    expect(useKibanaMock().services.http.post).toHaveBeenNthCalledWith(
      1,
      `${epmRouteService.getInstallPath('security_detection_engine', '8.2.1')}`,
      expect.objectContaining({ query: { prerelease: true } })
    );
    expect(useKibanaMock().services.http.post).toHaveBeenNthCalledWith(
      2,
      `${epmRouteService.getBulkInstallPath()}`,
      expect.objectContaining({
        body: expect.stringContaining('endpoint'),
        query: expect.objectContaining({ prerelease: true }),
      })
    );
  });
});
