/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiLink } from '@elastic/eui';
import { useApmParams } from '../../../../hooks/use_apm_params';
import { APIReturnType } from '../../../../services/rest/create_call_apm_api';
import { useApmRouter } from '../../../../hooks/use_apm_router';
import { FETCH_STATUS } from '../../../../hooks/use_fetcher';
import { useDiagnosticsContext } from '../context/use_diagnostics';
import { getIndexTemplateState } from '../data_stream_tab';
import { TabStatus } from './tab_status';

type DiagnosticsBundle = APIReturnType<'GET /internal/apm/diagnostics'>;

export function DataStreamsStatus() {
  const { diagnosticsBundle, status } = useDiagnosticsContext();
  const router = useApmRouter();
  const { query } = useApmParams('/diagnostics/*');
  const isLoading = status === FETCH_STATUS.LOADING;
  const isOk = getIsDataStreamTabOk(diagnosticsBundle);

  return (
    <TabStatus
      isLoading={isLoading}
      isOk={isOk}
      data-test-subj="dataStreamsStatus"
    >
      Data streams
      <EuiLink
        data-test-subj="apmDataStreamsStatusSeeDetailsLink"
        href={router.link('/diagnostics/data-streams', { query })}
      >
        See details
      </EuiLink>
    </TabStatus>
  );
}

export function getIsDataStreamTabOk(diagnosticsBundle?: DiagnosticsBundle) {
  if (!diagnosticsBundle) {
    return true;
  }

  return diagnosticsBundle.dataStreams.every((ds) => {
    const match = getIndexTemplateState(diagnosticsBundle, ds.template);
    return match?.exists && !match.isNonStandard;
  });
}
