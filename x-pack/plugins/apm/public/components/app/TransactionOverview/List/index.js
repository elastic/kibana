/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import styled from 'styled-components';
import TooltipOverlay from '../../../shared/TooltipOverlay';
import { RelativeLink, legacyEncodeURIComponent } from '../../../../utils/url';
import { asMillis, asDecimal } from '../../../../utils/formatters';
import { ImpactBar } from '../../../shared/ImpactBar';
import { fontFamilyCode, truncate } from '../../../../style/variables';
import { ManagedTable } from '../../../shared/ManagedTable';

const TransactionNameLink = styled(RelativeLink)`
  ${truncate('100%')};
  font-family: ${fontFamilyCode};
`;

export default function TransactionList({ items, serviceName, ...rest }) {
  const columns = [
    {
      field: 'name',
      name: 'Name',
      width: '50%',
      sortable: true,
      render: (transactionName, data) => {
        const encodedType = legacyEncodeURIComponent(
          data.sample.transaction.type
        );
        const encodedName = legacyEncodeURIComponent(transactionName);
        const transactionPath = `/${serviceName}/transactions/${encodedType}/${encodedName}`;

        return (
          <TooltipOverlay content={transactionName || 'N/A'}>
            <TransactionNameLink path={transactionPath}>
              {transactionName || 'N/A'}
            </TransactionNameLink>
          </TooltipOverlay>
        );
      }
    },
    {
      field: 'averageResponseTime',
      name: 'Avg. duration',
      sortable: true,
      dataType: 'number',
      render: value => asMillis(value)
    },
    {
      field: 'p95',
      name: '95th percentile',
      sortable: true,
      dataType: 'number',
      render: value => asMillis(value)
    },
    {
      field: 'transactionsPerMinute',
      name: 'Trans. per minute',
      sortable: true,
      dataType: 'number',
      render: value => `${asDecimal(value)} tpm`
    },
    {
      field: 'impact',
      name: 'Impact',
      sortable: true,
      dataType: 'number',
      render: value => <ImpactBar value={value} />
    }
  ];

  return (
    <ManagedTable
      columns={columns}
      items={items}
      initialSort={{ field: 'impact', direction: 'desc' }}
      initialPageSize={25}
      {...rest}
    />
  );
}
