/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  // @ts-ignore missing typings
  EuiAreaSeries,
  EuiFlexGroup,
  EuiFlexItem,
  // @ts-ignore missing typings
  EuiLineSeries,
  EuiPanel,
  // @ts-ignore missing typings
  EuiSeriesChart,
  // @ts-ignore missing typings
  EuiSeriesChartUtils,
  // @ts-ignore missing typings
  EuiSpacer,
  // @ts-ignore missing typings
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import React, { Fragment } from 'react';
import { MonitorChart } from '../../../common/graphql/types';
import { convertMicrosecondsToMilliseconds as microsToMillis } from '../../lib/helper';

interface MonitorChartsProps {
  checkDomainLimits: number[];
  danger: string;
  durationDomainLimits: number[];
  monitorChartData: MonitorChart;
  primary: string;
  secondary: string;
}

export const MonitorCharts = ({
  checkDomainLimits,
  danger,
  durationDomainLimits,
  monitorChartData: { durationArea, durationLine, status },
  primary,
  secondary,
}: MonitorChartsProps) => (
  <Fragment>
    <EuiFlexGroup>
      <EuiFlexItem>
        <EuiTitle size="xs">
          <h4>
            <FormattedMessage
              id="xpack.uptime.monitorCharts.monitorDuration.titleLabel"
              defaultMessage="Monitor Duration ms"
              description="The 'ms' is an abbreviation for milliseconds."
            />
          </h4>
        </EuiTitle>
        <EuiPanel style={{ maxWidth: 520, maxHeight: 220 }}>
          <EuiSeriesChart
            margins={{ left: 60, right: 40, top: 10, bottom: 40 }}
            width={500}
            height={200}
            xType={EuiSeriesChartUtils.SCALE.TIME}
            xCrosshairFormat="YYYY-MM-DD hh:mmZ"
            yDomain={durationDomainLimits}
          >
            <EuiAreaSeries
              color={secondary}
              name={i18n.translate(
                'xpack.uptime.monitorCharts.monitorDuration.series.durationRangeLabel',
                {
                  defaultMessage: 'Duration range',
                }
              )}
              data={durationArea.map(({ x, yMin, yMax }) => ({
                x,
                y0: microsToMillis(yMin),
                y: microsToMillis(yMax),
              }))}
              curve="curveBasis"
            />
            <EuiLineSeries
              color={primary}
              name={i18n.translate(
                'xpack.uptime.monitorCharts.monitorDuration.series.meanDurationLabel',
                {
                  defaultMessage: 'Mean duration',
                }
              )}
              data={durationLine.map(({ x, y }) => ({
                x,
                y: microsToMillis(y),
              }))}
            />
          </EuiSeriesChart>
        </EuiPanel>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiTitle size="xs">
          <h4>
            <FormattedMessage
              id="xpack.uptime.monitorCharts.checkStatus.title"
              defaultMessage="Check status"
            />
          </h4>
        </EuiTitle>
        <EuiPanel style={{ maxWidth: 520, maxHeight: 220 }}>
          <EuiSeriesChart
            margins={{ left: 60, right: 40, top: 10, bottom: 40 }}
            width={500}
            height={200}
            xType={EuiSeriesChartUtils.SCALE.TIME}
            xCrosshairFormat="YYYY-MM-DD hh:mmZ"
            stackBy="y"
            yDomain={checkDomainLimits}
          >
            <EuiAreaSeries
              name={i18n.translate('xpack.uptime.monitorCharts.checkStatus.series.upCountLabel', {
                defaultMessage: 'Up count',
              })}
              data={status.map(({ x, up }) => ({ x, y: up }))}
              curve="curveBasis"
              color={primary}
            />
            <EuiAreaSeries
              name={i18n.translate('xpack.uptime.monitorCharts.checkStatus.series.downCountLabel', {
                defaultMessage: 'Down count',
              })}
              data={status.map(({ x, down }) => ({ x, y: down }))}
              color={danger}
            />
          </EuiSeriesChart>
        </EuiPanel>
      </EuiFlexItem>
    </EuiFlexGroup>
  </Fragment>
);
