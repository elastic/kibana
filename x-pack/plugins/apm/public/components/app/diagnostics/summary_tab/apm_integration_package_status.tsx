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

function useApmPackage() {
  const { core } = useApmPluginContext();
  const { http } = core;

  const { loading, value } = useAsync(() => {
    return http.get('/api/fleet/epm/packages/apm');
  }, []);

  return {
    isLoading: loading,
    version: value?.response.version,
    isInstalled: value?.response?.status === 'installed',
  };
}

export function ApmIntegrationPackageStatus() {
  const { core } = useApmPluginContext();
  const { basePath } = core.http;

  const { isInstalled, isLoading, version } = useApmPackage();

  return (
    <EuiFlexGroup>
      <EuiFlexItem grow={1}>
        <EuiFlexGroup justifyContent="flexEnd">
          <EuiFlexItem grow={false}>
            {isLoading ? (
              <EuiBadge color="default">-</EuiBadge>
            ) : isInstalled ? (
              <EuiBadge color="green">OK</EuiBadge>
            ) : (
              <EuiBadge color="warning">Warning</EuiBadge>
            )}
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>

      <EuiFlexItem grow={10}>
        {isLoading
          ? '...'
          : isInstalled
          ? `APM integration (${version})`
          : 'APM integration: is not installed'}

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
