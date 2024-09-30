/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiEmptyPrompt } from '@elastic/eui';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { Redirect } from 'react-router-dom';
import { euiStyled } from '@kbn/kibana-react-plugin/common';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { FETCH_STATUS, useFetcher } from '../../../hooks/use_fetcher';
import { getRedirectToTransactionDetailPageUrl } from './get_redirect_to_transaction_detail_page_url';
import { getRedirectToTracePageUrl } from './get_redirect_to_trace_page_url';
import { useApmParams } from '../../../hooks/use_apm_params';
import { useTimeRange } from '../../../hooks/use_time_range';
import { ApmPluginStartDeps } from '../../../plugin';

const CentralizedContainer = euiStyled.div`
  height: 100%;
  display: flex;
`;

export function TraceLink() {
  const { services } = useKibana<ApmPluginStartDeps>();
  const { data: dataService } = services;
  const timeRange = dataService.query.timefilter.timefilter.getTime();
  const {
    path: { traceId },
    query: { rangeFrom = timeRange.from, rangeTo = timeRange.to },
  } = useApmParams('/link-to/trace/{traceId}');

  const { start, end } = useTimeRange({
    rangeFrom: rangeFrom || new Date(0).toISOString(),
    rangeTo: rangeTo || new Date().toISOString(),
  });

  const { data = { transaction: null }, status } = useFetcher(
    (callApmApi) => {
      if (traceId) {
        return callApmApi('GET /internal/apm/traces/{traceId}/root_transaction', {
          params: { path: { traceId }, query: { start, end } },
        });
      }
    },
    [traceId, start, end]
  );
  if (traceId && status === FETCH_STATUS.SUCCESS) {
    const to = data.transaction
      ? getRedirectToTransactionDetailPageUrl({
          transaction: data.transaction,
          rangeFrom,
          rangeTo,
        })
      : getRedirectToTracePageUrl({ traceId, rangeFrom, rangeTo });
    return <Redirect to={to} />;
  }

  return (
    <CentralizedContainer>
      <EuiEmptyPrompt
        iconType="apmTrace"
        title={
          <h2>
            {i18n.translate('xpack.apm.traceLink.fetchingTraceLabel', {
              defaultMessage: 'Fetching trace...',
            })}
          </h2>
        }
      />
    </CentralizedContainer>
  );
}
