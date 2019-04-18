/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useCallback } from 'react';
import { InjectedIntl, injectI18n } from '@kbn/i18n/react';
import { EuiTitle, EuiToolTip } from '@elastic/eui';
import {
  Chart,
  Axis,
  LineSeries,
  Position,
  ScaleType,
  timeFormatter,
  getSpecId,
  getAxisId,
} from '@elastic/charts';
import '@elastic/charts/dist/style.css';
import { last, first } from 'lodash';
import { niceTimeFormatByDay } from '@elastic/charts/dist/utils/data/formatters';
import { colorTransformer, MetricsExplorerColor } from '../../../common/color_palette';
import {
  MetricsExplorerSeries,
  MetricsExplorerAggregation,
  MetricsExplorerMetric,
} from '../../../server/routes/metrics_explorer/types';
import { MetricsExplorerOptions } from '../../containers/metrics_explorer/use_metrics_explorer_options';
import euiStyled from '../../../../../common/eui_styled_components';
import { createFormatter } from '../../utils/formatters';
import { createMetricLabel } from './create_metric_label';
import { InfraFormatterType } from '../../lib/lib';

interface Props {
  intl: InjectedIntl;
  title?: string | null;
  onFilter: (query: string) => void;
  width?: number | string;
  height?: number | string;
  options: MetricsExplorerOptions;
  series: MetricsExplorerSeries;
}

const createFormatterForMetric = (metric?: MetricsExplorerMetric) => {
  if (metric && metric.field) {
    const suffix = last(metric.field.split(/\./));
    if (suffix === 'pct') {
      return createFormatter(InfraFormatterType.percent);
    }
    if (suffix === 'bytes' && metric.aggregation === MetricsExplorerAggregation.rate) {
      return createFormatter(InfraFormatterType.bits, '{{value}}/s');
    }
    if (suffix === 'bytes') {
      return createFormatter(InfraFormatterType.bytes);
    }
  }
  return createFormatter(InfraFormatterType.number);
};

const dateFormatter = timeFormatter(niceTimeFormatByDay(1));

export const MetricsExplorerChart = injectI18n(
  ({ intl, options, series, title, onFilter, height = 200, width = '100%' }: Props) => {
    const { metrics } = options;
    const formatter = useCallback(createFormatterForMetric(first(metrics)), [options]);
    const handleFilter = useCallback(
      () => {
        if (options.groupBy) {
          onFilter(`${options.groupBy}: "${series.id}"`);
        }
      },
      [options, series.id, onFilter]
    );

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
            <Axis id={getAxisId('data')} position={Position.Left} tickFormat={formatter} />
            <Axis
              id={getAxisId('Time')}
              position={Position.Bottom}
              showOverlappingTicks={true}
              tickFormat={dateFormatter}
            />
            {metrics.map((metric, id) => {
              const color =
                (metric.color && colorTransformer(metric.color)) ||
                colorTransformer(MetricsExplorerColor.color0);
              const seriesLineStyle = {
                line: {
                  stroke: color,
                  strokeWidth: 2,
                  visible: true,
                },
                border: {
                  visible: false,
                  strokeWidth: 2,
                  stroke: color,
                },
                point: {
                  visible: false,
                  radius: 0.2,
                  stroke: color,
                  strokeWidth: 2,
                  opacity: 1,
                },
              };
              return (
                <LineSeries
                  key={`series-${series.id}-metric-${id}`}
                  id={getSpecId(createMetricLabel(metric))}
                  xScaleType={ScaleType.Time}
                  yScaleType={ScaleType.Linear}
                  xAccessor="timestamp"
                  yAccessors={[`metric_${id}`]}
                  data={series.rows}
                  lineSeriesStyle={seriesLineStyle}
                />
              );
            })}
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
