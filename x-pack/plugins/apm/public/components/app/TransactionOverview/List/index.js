/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import styled from 'styled-components';
import TooltipOverlay from '../../../shared/TooltipOverlay';
import { RelativeLink, legacyEncodeURIComponent } from '../../../../utils/url';
import { asMillis, asDecimal, tpmUnit } from '../../../../utils/formatters';
import { ImpactBar } from '../../../shared/ImpactBar';

import { fontFamilyCode, truncate } from '../../../../style/variables';
import { ManagedTable } from '../../../shared/ManagedTable';

function tpmLabel(type) {
  return type === 'request' ? 'Req. per minute' : 'Trans. per minute';
}

function avgLabel(agentName) {
  return agentName === 'js-base' ? 'Page load time' : 'Avg. duration';
}

const TransactionNameLink = styled(RelativeLink)`
  ${truncate('100%')};
  font-family: ${fontFamilyCode};
`;

export default function TransactionList({
  items,
  agentName,
  serviceName,
  type,
  ...rest
}) {
  const columns = [
    {
      field: 'name',
      name: 'Name',
      width: '50%',
      sortable: true,
      render: transactionName => {
        const transactionUrl = `${serviceName}/transactions/${legacyEncodeURIComponent(
          type
        )}/${legacyEncodeURIComponent(transactionName)}`;

        return (
          <TooltipOverlay content={transactionName || 'N/A'}>
            <TransactionNameLink path={`/${transactionUrl}`}>
              {transactionName || 'N/A'}
            </TransactionNameLink>
          </TooltipOverlay>
        );
      }
    },
    {
      field: 'averageResponseTime',
      name: avgLabel(agentName),
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
      name: tpmLabel(type),
      sortable: true,
      dataType: 'number',
      render: value => `${asDecimal(value)} ${tpmUnit(type)}`
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
