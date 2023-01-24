/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { KibanaServices, useKibana } from '../lib/kibana';
import type { RenderHookResult } from '@testing-library/react-hooks';
import { renderHook as _renderHook } from '@testing-library/react-hooks';
import { useUpgradeSecurityPackages } from './use_upgrade_security_packages';
import { epmRouteService } from '@kbn/fleet-plugin/common';

jest.mock('../components/user_privileges', () => {
  return {
    useUserPrivileges: jest.fn().mockReturnValue({
      endpointPrivileges: {
        canAccessFleet: true,
      },
    }),
  };
});
jest.mock('../lib/kibana');

describe('When using the `useUpgradeSecurityPackages()` hook', () => {
  const mockGetPrebuiltRulesPackageVersion =
    KibanaServices.getPrebuiltRulesPackageVersion as jest.Mock;
  const mockGetKibanaVersion = KibanaServices.getKibanaVersion as jest.Mock;
  const mockGetKibanaBranch = KibanaServices.getKibanaBranch as jest.Mock;
  let renderResult: RenderHookResult<object, void>;
  let renderHook: () => RenderHookResult<object, void>;
  let kibana: ReturnType<typeof useKibana>;

  // eslint-disable-next-line react/display-name
  const Wrapper = memo(({ children }) => {
    kibana = useKibana();
    return <>{children}</>;
  });

  beforeEach(() => {
    renderHook = () => {
      renderResult = _renderHook(() => useUpgradeSecurityPackages(), { wrapper: Wrapper });
      return renderResult;
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
    if (renderResult) {
      renderResult.unmount();
    }
  });

  it('should call fleet setup first via `isInitialized()` and then send upgrade request', async () => {
    renderHook();

    expect(kibana.services.fleet?.isInitialized).toHaveBeenCalled();
    expect(kibana.services.http.post).not.toHaveBeenCalled();

    await renderResult.waitFor(
      () => (kibana.services.http.post as jest.Mock).mock.calls.length > 0
    );

    expect(kibana.services.http.post).toHaveBeenCalledWith(
      `${epmRouteService.getBulkInstallPath()}`,
      expect.objectContaining({
        body: '{"packages":["endpoint","security_detection_engine"]}',
      })
    );
  });

  it('should send upgrade request with prerelease:false if branch is not `main` and build does not include `-SNAPSHOT`', async () => {
    mockGetKibanaVersion.mockReturnValue('8.0.0');
    mockGetKibanaBranch.mockReturnValue('release');

    renderHook();

    await renderResult.waitFor(
      () => (kibana.services.http.post as jest.Mock).mock.calls.length > 0
    );

    expect(kibana.services.http.post).toHaveBeenCalledWith(
      `${epmRouteService.getBulkInstallPath()}`,
      expect.objectContaining({
        body: '{"packages":["endpoint","security_detection_engine"]}',
        query: expect.objectContaining({ prerelease: false }),
      })
    );
  });

  it('should send upgrade request with prerelease:true if branch is `main` AND build includes `-SNAPSHOT`', async () => {
    mockGetKibanaVersion.mockReturnValue('8.0.0-SNAPSHOT');
    mockGetKibanaBranch.mockReturnValue('main');

    renderHook();

    await renderResult.waitFor(
      () => (kibana.services.http.post as jest.Mock).mock.calls.length > 0
    );

    expect(kibana.services.http.post).toHaveBeenCalledWith(
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

    renderHook();

    await renderResult.waitFor(
      () => (kibana.services.http.post as jest.Mock).mock.calls.length > 0
    );

    expect(kibana.services.http.post).toHaveBeenCalledWith(
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

    renderHook();

    await renderResult.waitFor(
      () => (kibana.services.http.post as jest.Mock).mock.calls.length > 0
    );

    expect(kibana.services.http.post).toHaveBeenCalledWith(
      `${epmRouteService.getBulkInstallPath()}`,
      expect.objectContaining({
        body: '{"packages":["endpoint","security_detection_engine"]}',
        query: expect.objectContaining({ prerelease: true }),
      })
    );
  });

  it('should send separate upgrade requests if prebuiltRulesPackageVersion is provided', async () => {
    mockGetPrebuiltRulesPackageVersion.mockReturnValue('8.2.1');

    renderHook();

    await renderResult.waitFor(
      () => (kibana.services.http.post as jest.Mock).mock.calls.length > 0
    );

    expect(kibana.services.http.post).toHaveBeenNthCalledWith(
      1,
      `${epmRouteService.getInstallPath('security_detection_engine', '8.2.1')}`,
      expect.objectContaining({ query: { prerelease: true } })
    );
    expect(kibana.services.http.post).toHaveBeenNthCalledWith(
      2,
      `${epmRouteService.getBulkInstallPath()}`,
      expect.objectContaining({
        body: expect.stringContaining('endpoint'),
        query: expect.objectContaining({ prerelease: true }),
      })
    );
  });
});
