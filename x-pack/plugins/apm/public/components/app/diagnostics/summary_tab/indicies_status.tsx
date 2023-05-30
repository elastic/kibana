/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge, EuiFlexGroup, EuiFlexItem, EuiLink } from '@elastic/eui';
import { useApmRouter } from '../../../../hooks/use_apm_router';
import { useDiagnosticsContext } from '../context/use_diagnostics';
import { getIndicesItems } from '../indices_tab';

export function FieldMappingStatus() {
  const router = useApmRouter();
  const { diagnosticsBundle, status } = useDiagnosticsContext();

  const isOk = getIndicesItems(diagnosticsBundle).invalidItems.length === 0;

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
