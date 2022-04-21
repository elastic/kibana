/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { useKibana } from '../lib/kibana';
import { renderHook as _renderHook, RenderHookResult } from '@testing-library/react-hooks';
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

// FLAKY: https://github.com/elastic/kibana/issues/112910
describe.skip('When using the `useUpgradeSecurityPackages()` hook', () => {
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
});
