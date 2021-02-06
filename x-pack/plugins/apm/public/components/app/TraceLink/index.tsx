/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiEmptyPrompt } from '@elastic/eui';
import React from 'react';
import { Redirect, RouteComponentProps } from 'react-router-dom';
import styled from 'styled-components';
import { FETCH_STATUS, useFetcher } from '../../../hooks/use_fetcher';
import { useUrlParams } from '../../../context/url_params_context/use_url_params';
import { getRedirectToTransactionDetailPageUrl } from './get_redirect_to_transaction_detail_page_url';
import { getRedirectToTracePageUrl } from './get_redirect_to_trace_page_url';

const CentralizedContainer = styled.div`
  height: 100%;
  display: flex;
`;

export function TraceLink({ match }: RouteComponentProps<{ traceId: string }>) {
  const { traceId } = match.params;
  const { urlParams } = useUrlParams();
  const { rangeFrom, rangeTo } = urlParams;

  const { data = { transaction: null }, status } = useFetcher(
    (callApmApi) => {
      if (traceId) {
        return callApmApi({
          endpoint: 'GET /api/apm/traces/{traceId}/root_transaction',
          params: {
            path: {
              traceId,
            },
          },
        });
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
