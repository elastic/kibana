/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import styled from 'styled-components';
import { NOT_AVAILABLE_LABEL } from '../../../../../common/i18n';
import { ServiceListAPIResponse } from '../../../../../server/lib/services/get_services';
import { fontSizes, truncate } from '../../../../style/variables';
import { asDecimal, asMillis } from '../../../../utils/formatters';
import { APMLink } from '../../../shared/Links/APMLink';
import { ITableColumn, ManagedTable } from '../../../shared/ManagedTable';
import { EnvironmentBadge } from '../../../shared/EnvironmentBadge';

interface Props {
  items?: ServiceListAPIResponse['items'];
  noItemsMessage?: React.ReactNode;
}

function formatNumber(value: number) {
  if (value === 0) {
    return '0';
  } else if (value <= 0.1) {
    return '< 0.1';
  } else {
    return asDecimal(value);
  }
}

function formatString(value?: string | null) {
  return value || NOT_AVAILABLE_LABEL;
}

const AppLink = styled(APMLink)`
  font-size: ${fontSizes.large};
  ${truncate('100%')};
`;

export const SERVICE_COLUMNS: Array<
  ITableColumn<ServiceListAPIResponse['items'][0]>
> = [
  {
    field: 'serviceName',
    name: i18n.translate('xpack.apm.servicesTable.nameColumnLabel', {
      defaultMessage: 'Name'
    }),
    width: '40%',
    sortable: true,
    render: (serviceName: string) => (
      <EuiToolTip content={formatString(serviceName)} id="service-name-tooltip">
        <AppLink path={`/${serviceName}/transactions`}>
          {formatString(serviceName)}
        </AppLink>
      </EuiToolTip>
    )
  },
  {
    field: 'environments',
    name: i18n.translate('xpack.apm.servicesTable.environmentColumnLabel', {
      defaultMessage: 'Environment'
    }),
    width: '20%',
    sortable: true,
    render: (environments: string[]) => (
      <EnvironmentBadge environments={environments} />
    )
  },
  {
    field: 'agentName',
    name: i18n.translate('xpack.apm.servicesTable.agentColumnLabel', {
      defaultMessage: 'Agent'
    }),
    sortable: true,
    render: (agentName: string) => formatString(agentName)
  },
  {
    field: 'avgResponseTime',
    name: i18n.translate('xpack.apm.servicesTable.avgResponseTimeColumnLabel', {
      defaultMessage: 'Avg. response time'
    }),
    sortable: true,
    dataType: 'number',
    render: (value: number) => asMillis(value)
  },
  {
    field: 'transactionsPerMinute',
    name: i18n.translate(
      'xpack.apm.servicesTable.transactionsPerMinuteColumnLabel',
      {
        defaultMessage: 'Trans. per minute'
      }
    ),
    sortable: true,
    dataType: 'number',
    render: (value: number) =>
      `${formatNumber(value)} ${i18n.translate(
        'xpack.apm.servicesTable.transactionsPerMinuteUnitLabel',
        {
          defaultMessage: 'tpm'
        }
      )}`
  },
  {
    field: 'errorsPerMinute',
    name: i18n.translate('xpack.apm.servicesTable.errorsPerMinuteColumnLabel', {
      defaultMessage: 'Errors per minute'
    }),
    sortable: true,
    dataType: 'number',
    render: (value: number) =>
      `${formatNumber(value)} ${i18n.translate(
        'xpack.apm.servicesTable.errorsPerMinuteUnitLabel',
        {
          defaultMessage: 'err.'
        }
      )}`
  }
];

export function ServiceList({ items = [], noItemsMessage }: Props) {
  return (
    <ManagedTable
      columns={SERVICE_COLUMNS}
      items={items}
      noItemsMessage={noItemsMessage}
      initialSort={{ field: 'serviceName', direction: 'asc' }}
      initialPageSize={50}
    />
  );
}
