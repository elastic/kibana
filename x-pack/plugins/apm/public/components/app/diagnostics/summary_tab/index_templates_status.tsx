/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiLink } from '@elastic/eui';
import { FETCH_STATUS } from '@kbn/observability-shared-plugin/public';
import { APIReturnType } from '../../../../services/rest/create_call_apm_api';
import { useApmRouter } from '../../../../hooks/use_apm_router';
import { useDiagnosticsContext } from '../context/use_diagnostics';
import { TabStatus } from './tab_status';

type DiagnosticsBundle = APIReturnType<'GET /internal/apm/diagnostics'>;

export function IndexTemplatesStatus() {
  const router = useApmRouter();
  const { diagnosticsBundle, status } = useDiagnosticsContext();
  const isLoading = status === FETCH_STATUS.LOADING;
  const tabStatus = getIndexTemplateStatus(diagnosticsBundle);

  return (
    <TabStatus isLoading={isLoading} isOk={tabStatus}>
      Index templates
      <EuiLink
        data-test-subj="apmIndexTemplatesStatusSeeDetailsLink"
        href={router.link('/diagnostics/index-templates')}
      >
        See details
      </EuiLink>
    </TabStatus>
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
