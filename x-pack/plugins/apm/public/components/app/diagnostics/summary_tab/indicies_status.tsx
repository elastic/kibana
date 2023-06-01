/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge, EuiFlexGroup, EuiFlexItem, EuiLink } from '@elastic/eui';
import { APIReturnType } from '../../../../services/rest/create_call_apm_api';
import { useApmRouter } from '../../../../hooks/use_apm_router';
import { useDiagnosticsContext } from '../context/use_diagnostics';

type DiagnosticsBundle = APIReturnType<'GET /internal/apm/diagnostics'>;

export function FieldMappingStatus() {
  const router = useApmRouter();
  const { diagnosticsBundle } = useDiagnosticsContext();
  const isOk = getIndicesTabStatus(diagnosticsBundle);

  return (
    <EuiFlexGroup>
      <EuiFlexItem grow={1}>
        <EuiFlexGroup justifyContent="flexEnd">
          <EuiFlexItem grow={false}>
            {isOk ? (
              <EuiBadge color="green">OK</EuiBadge>
            ) : (
              <EuiBadge color="danger">Error</EuiBadge>
            )}
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem grow={10}>
        Indices
        <EuiLink
          data-test-subj="apmFieldMappingStatusSeeDetailsLink"
          href={router.link('/diagnostics/indices')}
        >
          See details
        </EuiLink>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

export function getIndicesTabStatus(diagnosticsBundle?: DiagnosticsBundle) {
  return diagnosticsBundle?.invalidIndices.length === 0;
}
