/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiEmptyPrompt } from '@elastic/eui';
import React from 'react';
import { Redirect } from 'react-router-dom';
import { euiStyled } from '../../../../../../../src/plugins/kibana_react/common';
import { FETCH_STATUS, useFetcher } from '../../../hooks/use_fetcher';
import { getRedirectToTransactionDetailPageUrl } from './get_redirect_to_transaction_detail_page_url';
import { getRedirectToTracePageUrl } from './get_redirect_to_trace_page_url';
import { useApmParams } from '../../../hooks/use_apm_params';

const CentralizedContainer = euiStyled.div`
  height: 100%;
  display: flex;
`;

export function TraceLink() {
  const {
    path: { traceId },
    query: { rangeFrom, rangeTo },
  } = useApmParams('/link-to/trace/{traceId}');

  const { data = { transaction: null }, status } = useFetcher(
    (callApmApi) => {
      if (traceId) {
        return callApmApi(
          'GET /internal/apm/traces/{traceId}/root_transaction',
          {
            params: {
              path: {
                traceId,
              },
            },
          }
        );
      }
    },
    [traceId]
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
      <EuiEmptyPrompt iconType="apmTrace" title={<h2>Fetching trace...</h2>} />
    </CentralizedContainer>
  );
}
