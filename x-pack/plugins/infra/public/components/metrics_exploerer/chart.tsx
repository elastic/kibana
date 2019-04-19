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
  getGroupId,
} from '@elastic/charts';
import '@elastic/charts/dist/style.css';
import { last, max, min } from 'lodash';
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

interface AxisLookup {
  [id: string]: {
    metrics: string[];
    domains: Array<[number, number]>;
    formatter: (v: string | number) => string;
  };
}

const metricToFormat = (metric?: MetricsExplorerMetric) => {
  if (metric && metric.field) {
    const suffix = last(metric.field.split(/\./));
    if (suffix === 'pct') {
      return InfraFormatterType.percent;
    }
    if (suffix === 'bytes' && metric.aggregation === MetricsExplorerAggregation.rate) {
      return InfraFormatterType.bits;
    }
    if (suffix === 'bytes') {
      return InfraFormatterType.bytes;
    }
  }
  return InfraFormatterType.number;
};

const createFormatterForMetric = (metric?: MetricsExplorerMetric) => {
  if (metric && metric.field) {
    const format = metricToFormat(metric);
    if (
      format === InfraFormatterType.bits &&
      metric.aggregation === MetricsExplorerAggregation.rate
    ) {
      return createFormatter(InfraFormatterType.bits, '{{value}}/s');
    }
    return createFormatter(format);
  }
  return createFormatter(InfraFormatterType.number);
};

const dateFormatter = timeFormatter(niceTimeFormatByDay(1));

const getDomain = (id: string, series: MetricsExplorerSeries): [number, number] => {
  const values = series.rows.map(r => r[id] as number);
  return [min(values), max(values)];
};

export const MetricsExplorerChart = injectI18n(
  ({ intl, options, series, title, onFilter, height = 200, width = '100%' }: Props) => {
    const { metrics } = options;
    // const formatter = useCallback(createFormatterForMetric(first(metrics)), [options]);
    const handleFilter = useCallback(
      () => {
        if (options.groupBy) {
          onFilter(`${options.groupBy}: "${series.id}"`);
        }
      },
      [options, series.id, onFilter]
    );

    const axises = metrics.reduce(
      (acc, metric, index) => {
        const id = `metric_${index}`;
        const format = metricToFormat(metric);
        const axisDef = acc[format] || {
          metrics: [],
          domains: [],
          formatter: (v: string | number) => `${v}`,
        };
        axisDef.metrics.push(id);
        axisDef.domains.push(getDomain(id, series));
        axisDef.formatter = createFormatterForMetric(metric);
        acc[format] = axisDef;
        return acc;
      },
      {} as AxisLookup
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
              const yAccessor = `metric_${id}`;
              const groupId = getGroupId(`group-${metricToFormat(metric)}`);
              return (
                <LineSeries
                  key={`series-${series.id}-${yAccessor}`}
                  id={getSpecId(yAccessor)}
                  sortIndex={id}
                  name={createMetricLabel(metric)}
                  xScaleType={ScaleType.Time}
                  yScaleType={ScaleType.Linear}
                  xAccessor="timestamp"
                  yAccessors={[yAccessor]}
                  data={series.rows}
                  lineSeriesStyle={seriesLineStyle}
                  groupId={groupId}
                />
              );
            })}
            <Axis
              id={getAxisId('timestamp')}
              position={Position.Bottom}
              showOverlappingTicks={true}
              tickFormat={dateFormatter}
            />
            {Object.keys(axises).map((format, index) => {
              const axisDef = axises[format];
              const { domains, formatter } = axisDef;
              const minValues = domains.map(d => d[0]);
              const maxValues = domains.map(d => d[1]);
              const domain = { min: min(minValues), max: max(maxValues) };
              const position = index > 0 ? Position.Right : Position.Left;
              const id = `axis-for-${format}`;
              const groupId = getGroupId(`group-${format}`);
              return (
                <Axis
                  key={id}
                  id={getAxisId(id)}
                  position={position}
                  tickFormat={formatter}
                  domain={domain}
                  groupId={groupId}
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
