/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useCallback } from 'react';
import { InjectedIntl, injectI18n } from '@kbn/i18n/react';
import { EuiTitle, EuiToolTip } from '@elastic/eui';
import { Chart, Axis, Position, timeFormatter, getAxisId } from '@elastic/charts';
import '@elastic/charts/dist/style.css';
import { first } from 'lodash';
import { niceTimeFormatByDay } from '@elastic/charts/dist/utils/data/formatters';
import { MetricsExplorerSeries } from '../../../server/routes/metrics_explorer/types';
import { MetricsExplorerOptions } from '../../containers/metrics_explorer/use_metrics_explorer_options';
import euiStyled from '../../../../../common/eui_styled_components';
import { createFormatterForMetric } from './create_formatter_for_metric';
import { MetricLineSeries } from './line_series';

interface Props {
  intl: InjectedIntl;
  title?: string | null;
  onFilter: (query: string) => void;
  width?: number | string;
  height?: number | string;
  options: MetricsExplorerOptions;
  series: MetricsExplorerSeries;
}

const dateFormatter = timeFormatter(niceTimeFormatByDay(1));

export const MetricsExplorerChart = injectI18n(
  ({ intl, options, series, title, onFilter, height = 200, width = '100%' }: Props) => {
    const { metrics } = options;

    const handleFilter = useCallback(
      () => {
        if (options.groupBy) {
          onFilter(`${options.groupBy}: "${series.id}"`);
        }
      },
      [options, series.id, onFilter]
    );

    const yAxisFormater = useCallback(createFormatterForMetric(first(metrics)), [options]);

    return (
      <React.Fragment>
        {title ? (
          <EuiToolTip
            content={intl.formatMessage(
              {
                defaultMessage: 'Filter by "{name}"',
                id: 'xpack.infra.metricsExplorer.titleTooltip',
              },
              { name: title }
            )}
          >
            <EuiTitle size="xs">
              <ChartTitle onClick={handleFilter}>{title}</ChartTitle>
            </EuiTitle>
          </EuiToolTip>
        ) : null}
        <div style={{ height, width }}>
          <Chart>
            {metrics.map((metric, id) => (
              <MetricLineSeries metric={metric} id={id} series={series} />
            ))}
            <Axis
              id={getAxisId('timestamp')}
              position={Position.Bottom}
              showOverlappingTicks={true}
              tickFormat={dateFormatter}
            />
            <Axis id={getAxisId('values')} position={Position.Left} tickFormat={yAxisFormater} />
          </Chart>
        </div>
      </React.Fragment>
    );
  }
);

const ChartTitle = euiStyled.button`
      width: 100%
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      text-align: left;
    `;
