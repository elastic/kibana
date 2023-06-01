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

export function IndexTemplatesStatus() {
  const router = useApmRouter();
  const { diagnosticsBundle } = useDiagnosticsContext();
  const tabStatus = getIndexTemplateStatus(diagnosticsBundle);

  return (
    <EuiFlexGroup>
      <EuiFlexItem grow={1}>
        <EuiFlexGroup justifyContent="flexEnd">
          <EuiFlexItem grow={false}>
            {tabStatus ? (
              <EuiBadge color="green">OK</EuiBadge>
            ) : (
              <EuiBadge color="warning">Warning</EuiBadge>
            )}
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem grow={10}>
        Index templates
        <EuiLink
          data-test-subj="apmIndexTemplatesStatusSeeDetailsLink"
          href={router.link('/diagnostics/index-templates')}
        >
          See details
        </EuiLink>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

export function getIndexTemplateStatus(diagnosticsBundle?: DiagnosticsBundle) {
  const hasNonStandardIndexTemplates =
    diagnosticsBundle?.apmIndexTemplates?.some(
      ({ isNonStandard }) => isNonStandard
    );

  const isEveryExpectedApmIndexTemplateInstalled =
    diagnosticsBundle?.apmIndexTemplates.every(
      ({ exists, isNonStandard }) => isNonStandard || exists
    );

  return (
    isEveryExpectedApmIndexTemplateInstalled && !hasNonStandardIndexTemplates
  );
}
