/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import useAsync from 'react-use/lib/useAsync';
import { EuiBadge, EuiFlexGroup, EuiFlexItem, EuiLink } from '@elastic/eui';
import { useApmPluginContext } from '../../../../context/apm_plugin/use_apm_plugin_context';

function useIsApmPackageInstalled() {
  const { core } = useApmPluginContext();
  const { http } = core;

  const { loading, value } = useAsync(async () => {
    const res = await http.get<{
      response: { status: 'installed' | 'not_installed' };
    }>('/api/fleet/epm/packages/apm');
    const isInstalled = res?.response?.status === 'installed';
    return isInstalled;
  }, []);

  return { isLoadingApmPackageStatus: loading, isApmPackageInstalled: value };
}

export function ApmIntegrationPackageStatus() {
  const { core } = useApmPluginContext();
  const { basePath } = core.http;

  const { isApmPackageInstalled, isLoadingApmPackageStatus } =
    useIsApmPackageInstalled();

  return (
    <EuiFlexGroup>
      <EuiFlexItem grow={1}>
        <EuiFlexGroup justifyContent="flexEnd">
          <EuiFlexItem grow={false}>
            {isLoadingApmPackageStatus ? (
              <EuiBadge color="default">-</EuiBadge>
            ) : isApmPackageInstalled ? (
              <EuiBadge color="green">OK</EuiBadge>
            ) : (
              <EuiBadge color="warning">Warning</EuiBadge>
            )}
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>

      <EuiFlexItem grow={10}>
        {isLoadingApmPackageStatus
          ? '...'
          : isApmPackageInstalled
          ? 'APM integration is installed'
          : 'APM integration is not installed'}

        <EuiLink
          data-test-subj="apmDiagnosticsSummaryFasLink"
          href={basePath.prepend('/app/integrations/detail/apm/overview')}
        >
          Go to APM Integration
        </EuiLink>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
