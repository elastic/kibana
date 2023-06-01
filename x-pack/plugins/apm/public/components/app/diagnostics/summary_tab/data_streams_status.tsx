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
import { FETCH_STATUS } from '../../../../hooks/use_fetcher';
import { useDiagnosticsContext } from '../context/use_diagnostics';
import { getIsStandardIndexTemplateName } from '../data_stream_tab';

type DiagnosticsBundle = APIReturnType<'GET /internal/apm/diagnostics'>;

export function DataStreamsStatus() {
  const { diagnosticsBundle, status } = useDiagnosticsContext();
  const router = useApmRouter();
  const isLoading = status === FETCH_STATUS.LOADING;
  const tabStatus = getDataStreamTabStatus(diagnosticsBundle);

  return (
    <EuiFlexGroup>
      <EuiFlexItem grow={1}>
        <EuiFlexGroup justifyContent="flexEnd">
          <EuiFlexItem grow={false}>
            {isLoading ? (
              <EuiBadge color="default">-</EuiBadge>
            ) : tabStatus ? (
              <EuiBadge color="green">OK</EuiBadge>
            ) : (
              <EuiBadge color="warning">Warning</EuiBadge>
            )}
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>

      <EuiFlexItem grow={10}>
        Data streams
        <EuiLink
          data-test-subj="apmDataStreamsStatusSeeDetailsLink"
          href={router.link('/diagnostics/data-streams')}
        >
          See details
        </EuiLink>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

export function getDataStreamTabStatus(diagnosticsBundle?: DiagnosticsBundle) {
  const isEveryTemplateNameValid = (diagnosticsBundle?.dataStreams ?? []).every(
    (ds) =>
      diagnosticsBundle &&
      getIsStandardIndexTemplateName(diagnosticsBundle, ds.template)
  );

  const hasNonDataStreamIndices =
    diagnosticsBundle?.nonDataStreamIndices.length;
  return !hasNonDataStreamIndices && isEveryTemplateNameValid;
}
