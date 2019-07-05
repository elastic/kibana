/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import styled from 'styled-components';
import { NOT_AVAILABLE_LABEL } from 'x-pack/plugins/apm/common/i18n';
import { ITransactionGroup } from 'x-pack/plugins/apm/server/lib/transaction_groups/transform';
import { fontFamilyCode, truncate } from '../../../../style/variables';
import { asDecimal, asMillis } from '../../../../utils/formatters';
import { ImpactBar } from '../../../shared/ImpactBar';
import { KibanaLink } from '../../../shared/Links/KibanaLink';
import { legacyEncodeURIComponent } from '../../../shared/Links/url_helpers';
import { ITableColumn, ManagedTable } from '../../../shared/ManagedTable';

const TransactionNameLink = styled(KibanaLink)`
  ${truncate('100%')};
  font-family: ${fontFamilyCode};
`;

interface Props {
  items: ITransactionGroup[];
  serviceName: string;
}

export function TransactionList({ items, serviceName, ...rest }: Props) {
  const columns: ITableColumn[] = [
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
          <EuiToolTip
            id="transaction-name-link-tooltip"
            content={transactionName || NOT_AVAILABLE_LABEL}
          >
            <TransactionNameLink hash={transactionPath}>
              {transactionName || NOT_AVAILABLE_LABEL}
            </TransactionNameLink>
          </EuiToolTip>
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
