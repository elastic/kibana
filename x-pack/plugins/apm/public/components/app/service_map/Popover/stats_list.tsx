/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingChart,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { isNumber } from 'lodash';
import React, { useMemo } from 'react';
import { euiStyled } from '../../../../../../../../src/plugins/kibana_react/common';
import { NodeStats } from '../../../../../common/service_map';
import {
  asDuration,
  asPercent,
  asTransactionRate,
} from '../../../../../common/utils/formatters';
import { Coordinate } from '../../../../../typings/timeseries';
import { SparkPlot, Color } from '../../../shared/charts/spark_plot';

export const ItemTitle = euiStyled(EuiFlexItem)`
  color: ${({ theme }) => theme.eui.euiTextSubduedColor};
  display: flex;
  justify-content: end;
`;

function LoadingSpinner() {
  return (
    <EuiFlexGroup
      alignItems="center"
      justifyContent="spaceAround"
      style={{ height: 170 }}
    >
      <EuiLoadingChart size="xl" />
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

interface Item {
  title: string;
  valueLabel: string | null;
  timeseries?: Coordinate[];
  color: Color;
}

export function StatsList({ data, isLoading }: StatsListProps) {
  const { cpuUsage, errorRate, memoryUsage, transactionStats } = data;

  const hasData = [
    cpuUsage?.value,
    errorRate?.value,
    memoryUsage?.value,
    transactionStats?.throughput?.value,
    transactionStats?.latency?.value,
  ].some((stat) => isNumber(stat));

  const items: Item[] = useMemo(
    () => [
      {
        title: i18n.translate(
          'xpack.apm.serviceMap.avgTransDurationPopoverStat',
          {
            defaultMessage: 'Latency (avg.)',
          }
        ),
        valueLabel: isNumber(transactionStats?.latency?.value)
          ? asDuration(transactionStats?.latency?.value)
          : null,
        timeseries: transactionStats?.latency?.timeseries,
        color: 'euiColorVis1',
      },
      {
        title: i18n.translate(
          'xpack.apm.serviceMap.avgReqPerMinutePopoverMetric',
          {
            defaultMessage: 'Throughput (avg.)',
          }
        ),
        valueLabel: asTransactionRate(transactionStats?.throughput?.value),
        timeseries: transactionStats?.throughput?.timeseries,
        color: 'euiColorVis0',
      },
      {
        title: i18n.translate('xpack.apm.serviceMap.errorRatePopoverStat', {
          defaultMessage: 'Failed transaction rate (avg.)',
        }),
        valueLabel: asPercent(errorRate?.value, 1, ''),
        timeseries: errorRate?.timeseries,
        color: 'euiColorVis7',
      },
      {
        title: i18n.translate('xpack.apm.serviceMap.avgCpuUsagePopoverStat', {
          defaultMessage: 'CPU usage (avg.)',
        }),
        valueLabel: asPercent(cpuUsage?.value, 1, ''),
        timeseries: cpuUsage?.timeseries,
        color: 'euiColorVis3',
      },
      {
        title: i18n.translate(
          'xpack.apm.serviceMap.avgMemoryUsagePopoverStat',
          {
            defaultMessage: 'Memory usage (avg.)',
          }
        ),
        valueLabel: asPercent(memoryUsage?.value, 1, ''),
        timeseries: memoryUsage?.timeseries,
        color: 'euiColorVis8',
      },
    ],
    [cpuUsage, errorRate, memoryUsage, transactionStats]
  );

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!hasData) {
    return <NoDataMessage />;
  }

  return (
    <EuiFlexGroup direction="column" responsive={false} gutterSize="m">
      {items.map(({ title, valueLabel, timeseries, color }) => {
        if (!valueLabel) {
          return null;
        }
        return (
          <EuiFlexItem key={title}>
            <EuiFlexGroup gutterSize="none" responsive={false}>
              <ItemTitle>{title}</ItemTitle>
              <EuiFlexItem grow={false}>
                {timeseries ? (
                  <SparkPlot
                    series={timeseries}
                    color={color}
                    valueLabel={valueLabel}
                  />
                ) : (
                  <div>{valueLabel}</div>
                )}
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        );
      })}
    </EuiFlexGroup>
  );
}
