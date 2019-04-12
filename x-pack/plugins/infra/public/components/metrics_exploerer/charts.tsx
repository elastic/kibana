/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiButton,
  EuiButtonIcon,
  EuiFlexGrid,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiHorizontalRule,
  EuiTitle,
  EuiToolTip,
  EuiIcon,
} from '@elastic/eui';
import {
  EuiCrosshairX,
  EuiDataPoint,
  EuiLineSeries,
  EuiSeriesChart,
  EuiYAxis,
  EuiXAxis,
} from '@elastic/eui/lib/experimental';
import { FormattedMessage, InjectedIntl, injectI18n } from '@kbn/i18n/react';
import { first, isNumber, last } from 'lodash';
import moment from 'moment';
import React, { useCallback } from 'react';
import euiStyled from '../../../../..//common/eui_styled_components';
import { colorTransformer, MetricsExplorerColor } from '../../../common/color_palette';
import {
  MetricsExplorerResponse,
  MetricsExplorerAggregation,
  MetricsExplorerMetric,
} from '../../../server/routes/metrics_explorer/types';
import { MetricsExplorerOptions } from '../../containers/metrics_explorer/use_metrics_explorer_options';
import { InfraLoadingPanel } from '../loading';
import { createMetricLabel } from './create_metric_label';
import { createFormatter } from '../../utils/formatters';
import { InfraFormatterType } from '../../lib/lib';
import { NoData } from '../empty_states/no_data';

const LEFT_MARGIN = 60;

const titleFormatter = (dataPoints: EuiDataPoint[]) => {
  if (dataPoints.length > 0) {
    const [firstDataPoint] = dataPoints;
    const { originalValues } = firstDataPoint;
    return {
      title: <EuiIcon type="clock" />,
      value: moment(originalValues.x).format('MMM D, YYYY h:mm:ss A'),
    };
  }
};

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

interface Props {
  loading: boolean;
  options: MetricsExplorerOptions;
  onLoadMore: (afterKey: string | null) => void;
  onRefetch: () => void;
  onFilter: (filter: string) => void;
  data: MetricsExplorerResponse | null;
  intl: InjectedIntl;
}
export const MetricsExplorerCharts = injectI18n(
  ({ loading, data, onLoadMore, options, onRefetch, intl, onFilter }: Props) => {
    const intlPrefix = 'xpack.infra.metricsExplorer';
    if (!data && loading) {
      return (
        <InfraLoadingPanel
          height={800}
          width="100%"
          text={intl.formatMessage({
            defaultMessage: 'Loading charts',
            id: `${intlPrefix}.loadingCharts`,
          })}
        />
      );
    }

    if (!data || data.series.length === 0) {
      return (
        <NoData
          titleText={intl.formatMessage({
            id: `${intlPrefix}.noDataTitle`,
            defaultMessage: 'There is no data to display.',
          })}
          bodyText={intl.formatMessage({
            id: `${intlPrefix}.noDataBodyText`,
            defaultMessage: 'Try adjusting your time, filters or group by settings.',
          })}
          refetchText={intl.formatMessage({
            id: `${intlPrefix}.noDataRefetchText`,
            defaultMessage: 'Check for new data',
          })}
          testString="metrics-explorer-no-data"
          onRefetch={onRefetch}
        />
      );
    }

    const metrics =
      options.aggregation === MetricsExplorerAggregation.count
        ? [{ aggregation: MetricsExplorerAggregation.count }]
        : options.metrics;

    const formatter = useCallback(createFormatterForMetric(first(metrics)), [options]);

    const itemsFormatter = useCallback(
      (dataPoints: EuiDataPoint[]) => {
        return dataPoints.map(d => {
          const metric = metrics[d.seriesIndex];
          const dataFormatter = createFormatterForMetric(metric);
          return {
            title: (
              <span>
                <EuiIcon
                  type="dot"
                  style={{
                    color: colorTransformer(
                      (metric && metric.color) || MetricsExplorerColor.color0
                    ),
                  }}
                />
                {createMetricLabel(metric)}
              </span>
            ),
            value: dataFormatter(d.y),
          };
        });
      },
      [options]
    );

    const seriesNames = metrics.map(createMetricLabel);
    return (
      <div>
        <EuiFlexGrid gutterSize="s" columns={data.series.length === 1 ? 1 : 3}>
          {data.series.map(series => (
            <EuiFlexItem key={series.id} style={{ padding: 16, minWidth: 0 }}>
              {data.series.length > 1 ? (
                <EuiToolTip
                  content={intl.formatMessage(
                    { defaultMessage: 'Filter by "{name}"', id: `${intlPrefix}.titleTooltip` },
                    { name: series.id }
                  )}
                >
                  <EuiTitle size="xs">
                    <ChartTitle onClick={() => onFilter(`${options.groupBy}: "${series.id}"`)}>
                      {series.id}
                    </ChartTitle>
                  </EuiTitle>
                </EuiToolTip>
              ) : null}
              <div style={{ height: data.series.length > 1 ? 200 : 400 }}>
                <EuiSeriesChart
                  animateData={false}
                  xType="time"
                  showDefaultAxis={false}
                  showCrosshair={false}
                  marginLeft={LEFT_MARGIN}
                >
                  <EuiXAxis marginLeft={LEFT_MARGIN} />
                  <EuiYAxis tickFormat={formatter} marginLeft={LEFT_MARGIN} />
                  <EuiCrosshairX
                    marginLeft={LEFT_MARGIN}
                    titleFormat={titleFormatter}
                    itemsFormat={itemsFormatter}
                    seriesNames={seriesNames}
                  />
                  {metrics.map((metric, id) => {
                    const chartData = series.rows.map(row => ({
                      x: row.timestamp,
                      y: isNumber(row[`metric_${id}`]) ? (row[`metric_${id}`] as number) : 0,
                      y0: 0,
                    }));
                    return (
                      <EuiLineSeries
                        marginLeft={LEFT_MARGIN}
                        key={`metric_chart_${id}`}
                        color={
                          (metric.color && colorTransformer(metric.color)) ||
                          colorTransformer(MetricsExplorerColor.color0)
                        }
                        lineSize={2}
                        name={createMetricLabel(metric)}
                        data={chartData}
                      />
                    );
                  })}
                </EuiSeriesChart>
              </div>
            </EuiFlexItem>
          ))}
        </EuiFlexGrid>
        {data.series.length > 1 ? (
          <div style={{ textAlign: 'center', marginBottom: 16 }}>
            <EuiHorizontalRule />
            <EuiText color="subdued">
              <p>
                <FormattedMessage
                  id={`${intlPrefix}.footerPaginationMessage`}
                  defaultMessage='Displaying {length} of {total} charts grouped by "{groupBy}".'
                  values={{
                    length: data.series.length,
                    total: data.pageInfo.total,
                    groupBy: options.groupBy,
                  }}
                />
              </p>
            </EuiText>
            {data.pageInfo.afterKey ? (
              <div style={{ margin: '16px 0' }}>
                <EuiButton
                  isLoading={loading}
                  size="s"
                  onClick={() => onLoadMore(data.pageInfo.afterKey || null)}
                >
                  <FormattedMessage
                    id={`${intlPrefix}.loadMoreChartsButton`}
                    defaultMessage="Load More Charts"
                  />
                </EuiButton>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    );
  }
);

const ChartTitle = euiStyled.button`
  width: 100%
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;
