/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiBadge, EuiFlexGroup, EuiFlexItem, EuiLink } from '@elastic/eui';

import { useApmPluginContext } from '../../../../context/apm_plugin/use_apm_plugin_context';
import { FETCH_STATUS } from '../../../../hooks/use_fetcher';
import { useDiagnosticsContext } from '../context/use_diagnostics';

export function ApmIntegrationPackageStatus() {
  const { diagnosticsBundle, status, isImported } = useDiagnosticsContext();
  const { core } = useApmPluginContext();
  const { basePath } = core.http;

  const isLoading = status === FETCH_STATUS.LOADING;
  const isInstalled = diagnosticsBundle?.fleetPackageInfo.isInstalled;
  const packageVersion = diagnosticsBundle?.fleetPackageInfo.version;

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

      <EuiFlexItem
        grow={10}
        data-test-subj="apmDiagnosticsSummaryApmIntegration"
      >
        {isLoading
          ? '...'
          : isInstalled
          ? `APM integration (${packageVersion})`
          : 'APM integration: not installed'}

        {!isImported ? (
          <EuiLink
            data-test-subj="apmDiagnosticsSummaryFasLink"
            href={basePath.prepend('/app/integrations/detail/apm/overview')}
          >
            Go to APM Integration
          </EuiLink>
        ) : null}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
