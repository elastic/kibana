/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { isNumber } from 'lodash';
import React from 'react';
import styled from 'styled-components';
import {
  asDuration,
  asPercent,
  asTransactionRate,
} from '../../../../../common/utils/formatters';
import { ServiceNodeStats } from '../../../../../common/service_map';

export const ItemRow = styled('tr')`
  line-height: 2;
`;

export const ItemTitle = styled('td')`
  color: ${({ theme }) => theme.eui.euiTextSubduedColor};
  padding-right: 1rem;
`;

export const ItemDescription = styled('td')`
  text-align: right;
`;

type ServiceStatsListProps = ServiceNodeStats;

export function ServiceStatsList({
  transactionStats,
  avgErrorRate,
  avgCpuUsage,
  avgMemoryUsage,
}: ServiceStatsListProps) {
  const listItems = [
    {
      title: i18n.translate(
        'xpack.apm.serviceMap.avgTransDurationPopoverStat',
        {
          defaultMessage: 'Trans. duration (avg.)',
        }
      ),
      description: isNumber(transactionStats.avgTransactionDuration)
        ? asDuration(transactionStats.avgTransactionDuration)
        : null,
    },
    {
      title: i18n.translate(
        'xpack.apm.serviceMap.avgReqPerMinutePopoverMetric',
        {
          defaultMessage: 'Req. per minute (avg.)',
        }
      ),
      description: asTransactionRate(transactionStats.avgRequestsPerMinute),
    },
    {
      title: i18n.translate('xpack.apm.serviceMap.errorRatePopoverStat', {
        defaultMessage: 'Trans. error rate (avg.)',
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
        {listItems.map(
          ({ title, description }) =>
            description && (
              <ItemRow key={title}>
                <ItemTitle>{title}</ItemTitle>
                <ItemDescription>{description}</ItemDescription>
              </ItemRow>
            )
        )}
      </tbody>
    </table>
  );
}
