/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiEmptyPrompt } from '@elastic/eui';
import React from 'react';
import { Redirect, RouteComponentProps } from 'react-router-dom';
import { euiStyled } from '../../../../../../../src/plugins/kibana_react/common';
import { FETCH_STATUS, useFetcher } from '../../../hooks/use_fetcher';
import { useUrlParams } from '../../../context/url_params_context/use_url_params';
import { getRedirectToTransactionDetailPageUrl } from '../TraceLink/get_redirect_to_transaction_detail_page_url';

const CentralizedContainer = euiStyled.div`
  height: 100%;
  display: flex;
`;

export function TransactionLink({
  match,
}: RouteComponentProps<{ transactionId: string }>) {
  const { transactionId } = match.params;
  const { urlParams } = useUrlParams();
  const { rangeFrom, rangeTo } = urlParams;

  const { data = { transaction: null }, status } = useFetcher(
    (callApmApi) => {
      if (transactionId) {
        return callApmApi({
          endpoint: 'GET /api/apm/transactions/{transactionId}',
          params: {
            path: {
              transactionId,
            },
          },
        });
      }
    },
    [transactionId]
  );
  if (transactionId && status === FETCH_STATUS.SUCCESS) {
    if (data.transaction) {
      return (
        <Redirect
          to={getRedirectToTransactionDetailPageUrl({
            transaction: data.transaction,
            rangeFrom,
            rangeTo,
          })}
        />
      );
    }

    return <CentralizedContainer />;
  }

  return (
    <CentralizedContainer>
      <EuiEmptyPrompt
        iconType="apmTrace"
        title={<h2>Fetching transaction...</h2>}
      />
    </CentralizedContainer>
  );
}
