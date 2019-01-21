/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import React from 'react';
import styled from 'styled-components';
import TooltipOverlay from '../../../shared/TooltipOverlay';
import { asMillis, asDecimal } from '../../../../utils/formatters';
import { ImpactBar } from '../../../shared/ImpactBar';
import { fontFamilyCode, truncate } from '../../../../style/variables';
import { ManagedTable } from '../../../shared/ManagedTable';
import { NOT_AVAILABLE_LABEL } from '../../../../constants';
import { legacyEncodeURIComponent } from '../../../shared/Links/url_helpers';
import { KibanaLink } from '../../../shared/Links/KibanaLink';

const TransactionNameLink = styled(KibanaLink)`
  ${truncate('100%')};
  font-family: ${fontFamilyCode};
`;

export default function TransactionList({ items, serviceName, ...rest }) {
  const columns = [
    {
      field: 'name',
      name: i18n.translate('xpack.apm.transactionsTable.nameColumnLabel', {
        defaultMessage: 'Name'
      }),
      width: '50%',
      sortable: true,
      render: (transactionName, data) => {
        const encodedType = legacyEncodeURIComponent(
          data.sample.transaction.type
        );
        const encodedName = legacyEncodeURIComponent(transactionName);
        const transactionPath = `/${serviceName}/transactions/${encodedType}/${encodedName}`;

        return (
          <TooltipOverlay content={transactionName || NOT_AVAILABLE_LABEL}>
            <TransactionNameLink hash={transactionPath}>
              {transactionName || NOT_AVAILABLE_LABEL}
            </TransactionNameLink>
          </TooltipOverlay>
        );
      }
    },
    {
      field: 'averageResponseTime',
      name: i18n.translate(
        'xpack.apm.transactionsTable.avgDurationColumnLabel',
        {
          defaultMessage: 'Avg. duration'
        }
      ),
      sortable: true,
      dataType: 'number',
      render: value => asMillis(value)
    },
    {
      field: 'p95',
      name: i18n.translate(
        'xpack.apm.transactionsTable.95thPercentileColumnLabel',
        {
          defaultMessage: '95th percentile'
        }
      ),
      sortable: true,
      dataType: 'number',
      render: value => asMillis(value)
    },
    {
      field: 'transactionsPerMinute',
      name: i18n.translate(
        'xpack.apm.transactionsTable.transactionsPerMinuteColumnLabel',
        {
          defaultMessage: 'Trans. per minute'
        }
      ),
      sortable: true,
      dataType: 'number',
      render: value =>
        `${asDecimal(value)} ${i18n.translate(
          'xpack.apm.transactionsTable.transactionsPerMinuteUnitLabel',
          {
            defaultMessage: 'tpm'
          }
        )}`
    },
    {
      field: 'impact',
      name: i18n.translate('xpack.apm.transactionsTable.impactColumnLabel', {
        defaultMessage: 'Impact'
      }),
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
