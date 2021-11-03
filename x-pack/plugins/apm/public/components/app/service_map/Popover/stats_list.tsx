/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiLoadingSpinner, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { isNumber } from 'lodash';
import React from 'react';
import { euiStyled } from '../../../../../../../../src/plugins/kibana_react/common';
import { NodeStats } from '../../../../../common/service_map';
import {
  asDuration,
  asPercent,
  asTransactionRate,
} from '../../../../../common/utils/formatters';

export const ItemRow = euiStyled.tr`
  line-height: 2;
`;

export const ItemTitle = euiStyled.td`
  color: ${({ theme }) => theme.eui.euiTextSubduedColor};
  padding-right: 1rem;
`;

export const ItemDescription = euiStyled.td`
  text-align: right;
`;

function LoadingSpinner() {
  return (
    <EuiFlexGroup
      alignItems="center"
      justifyContent="spaceAround"
      style={{ height: 170 }}
    >
      <EuiLoadingSpinner size="xl" />
    </EuiFlexGroup>
  );
}

function NoDataMessage() {
  return (
    <EuiText color="subdued">
      {i18n.translate('xpack.apm.serviceMap.popover.noDataText', {
        defaultMessage: `No data for selected environment. Try switching to another environment.`,
      })}
    </EuiText>
  );
}

interface StatsListProps {
  isLoading: boolean;
  data: NodeStats;
}

export function StatsList({ data, isLoading }: StatsListProps) {
  const {
    avgCpuUsage,
    avgErrorRate,
    avgMemoryUsage,
    transactionStats: { avgRequestsPerMinute, avgTransactionDuration },
  } = data;

  const hasData = [
    avgCpuUsage,
    avgErrorRate,
    avgMemoryUsage,
    avgRequestsPerMinute,
    avgTransactionDuration,
  ].some((stat) => isNumber(stat));

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!hasData) {
    return <NoDataMessage />;
  }

  const items = [
    {
      title: i18n.translate(
        'xpack.apm.serviceMap.avgTransDurationPopoverStat',
        {
          defaultMessage: 'Latency (avg.)',
        }
      ),
      description: isNumber(avgTransactionDuration)
        ? asDuration(avgTransactionDuration)
        : null,
    },
    {
      title: i18n.translate(
        'xpack.apm.serviceMap.avgReqPerMinutePopoverMetric',
        {
          defaultMessage: 'Throughput (avg.)',
        }
      ),
      description: asTransactionRate(avgRequestsPerMinute),
    },
    {
      title: i18n.translate('xpack.apm.serviceMap.errorRatePopoverStat', {
        defaultMessage: 'Failed transaction rate (avg.)',
      }),
      description: asPercent(avgErrorRate, 1, ''),
    },
    {
      title: i18n.translate('xpack.apm.serviceMap.avgCpuUsagePopoverStat', {
        defaultMessage: 'CPU usage (avg.)',
      }),
      description: asPercent(avgCpuUsage, 1, ''),
    },
    {
      title: i18n.translate('xpack.apm.serviceMap.avgMemoryUsagePopoverStat', {
        defaultMessage: 'Memory usage (avg.)',
      }),
      description: asPercent(avgMemoryUsage, 1, ''),
    },
  ];

  return (
    <table>
      <tbody>
        {items.map(({ title, description }) => {
          return description ? (
            <ItemRow key={title}>
              <ItemTitle>{title}</ItemTitle>
              <ItemDescription>{description}</ItemDescription>
            </ItemRow>
          ) : null;
        })}
      </tbody>
    </table>
  );
}
