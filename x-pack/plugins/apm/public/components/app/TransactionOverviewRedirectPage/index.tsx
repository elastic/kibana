/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiEmptyPrompt } from '@elastic/eui';
import React from 'react';
import { Redirect } from 'react-router-dom';
import styled from 'styled-components';
import { useFetcher } from '../../../hooks/useFetcher';
import { useUrlParams } from '../../../hooks/useUrlParams';
import { redirectToTransactionDetailPage } from '../TraceLink/redirect_to_transaction_detail_page';
import { useLocation } from '../../../hooks/useLocation';
import { toQuery } from '../../shared/Links/url_helpers';

const CentralizedContainer = styled.div`
  height: 100%;
  display: flex;
`;

export const TransactionOverviewRedirectPage = () => {
  const { urlParams, uiFilters } = useUrlParams();
  const { start, end, rangeFrom, rangeTo } = urlParams;

  const { search } = useLocation();

  const { serviceName, transactionName } = toQuery(search) as {
    serviceName?: string;
    transactionName?: string;
  };

  const { data = { transaction: null } } = useFetcher(
    (callApmApi) => {
      if (serviceName && transactionName && start && end) {
        return callApmApi({
          pathname: '/api/apm/transaction_sample',
          params: {
            query: {
              serviceName,
              transactionName,
              start,
              end,
              uiFilters: JSON.stringify(uiFilters),
            },
          },
        });
      }
    },
    [end, serviceName, start, transactionName, uiFilters]
  );

  if (data && data.transaction) {
    const to = redirectToTransactionDetailPage({
      transaction: data.transaction,
      rangeFrom,
      rangeTo,
    });
    return <Redirect to={to} />;
  }

  return (
    <CentralizedContainer>
      <EuiEmptyPrompt
        iconType="apmTrace"
        title={<h2>Fetching transaction sample...</h2>}
      />
    </CentralizedContainer>
  );
};
