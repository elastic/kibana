/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiEmptyPrompt } from '@elastic/eui';
import React from 'react';
import { Redirect } from 'react-router-dom';
import styled from 'styled-components';
import { FETCH_STATUS, useFetcher } from '../../../hooks/useFetcher';
import { useUrlParams } from '../../../hooks/useUrlParams';
import { redirectToTransactionDetailPage } from './redirect_to_transaction_detail_page';
import { redirectToTracePage } from './redirect_to_trace_page';

const CentralizedContainer = styled.div`
  height: 100%;
  display: flex;
`;

export const TraceLink = () => {
  const { urlParams } = useUrlParams();
  const { traceIdLink: traceId, rangeFrom, rangeTo } = urlParams;

  const { data = { transaction: null }, status } = useFetcher(
    (callApmApi) => {
      if (traceId) {
        return callApmApi({
          pathname: '/api/apm/transaction/{traceId}',
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
      ? redirectToTransactionDetailPage({
          transaction: data.transaction,
          rangeFrom,
          rangeTo,
        })
      : redirectToTracePage({ traceId, rangeFrom, rangeTo });
    return <Redirect to={to} />;
  }

  return (
    <CentralizedContainer>
      <EuiEmptyPrompt iconType="apmTrace" title={<h2>Fetching trace...</h2>} />
    </CentralizedContainer>
  );
};
