/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiButton,
  EuiFlexGrid,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiText,
  EuiTitle,
  EuiToolTip,
} from '@elastic/eui';
import {
  EuiAreaSeries,
  EuiBarSeries,
  EuiCrosshairX,
  EuiDataPoint,
  EuiLineSeries,
  EuiSeriesChart,
  EuiSeriesChartProps,
  EuiSeriesProps,
  EuiXAxis,
  EuiYAxis,
} from '@elastic/eui/lib/experimental';
import { FormattedMessage, InjectedIntl, injectI18n } from '@kbn/i18n/react';
import { isNumber } from 'lodash';
import React from 'react';
import euiStyled from '../../../../..//common/eui_styled_components';
import { colorTransformer, MetricsExplorerColor } from '../../../common/color_palette';
import { MetricsExplorerResponse } from '../../../server/routes/metrics_explorer/types';
import { MetricsExplorerOptions } from '../../containers/metrics_explorer/use_metrics_explorer_options';
import { NoData } from '../empty_states/no_data';
import { InfraLoadingPanel } from '../loading';
import { createMetricLabel } from './create_metric_label';

interface Props {
  loading: boolean;
  options: MetricsExplorerOptions;
  onLoadMore: (afterKey: string | null) => void;
  onRefetch: () => void;
  data: MetricsExplorerResponse | null;
  intl: InjectedIntl;
}
export const MetricsExplorerCharts = injectI18n(
  ({ loading, data, onLoadMore, options, onRefetch, intl }: Props) => {
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

    return (
      <div>
        <EuiFlexGrid gutterSize="s" columns={data.series.length === 1 ? 1 : 3}>
          {data.series.map(series => (
            <EuiFlexItem key={series.id} style={{ padding: 16, minWidth: 0 }}>
              {data.series.length > 1 ? (
                <EuiToolTip content={series.id}>
                  <EuiTitle size="xs">
                    <ChartTitle>{series.id}</ChartTitle>
                  </EuiTitle>
                </EuiToolTip>
              ) : null}
              <div style={{ height: data.series.length > 1 ? 200 : 400 }}>
                <EuiSeriesChart animateData={false} xType="time">
                  {options.metrics.map((metric, id) => (
                    <EuiLineSeries
                      key={`metric_series_${id}`}
                      color={
                        (metric.color && colorTransformer(metric.color)) ||
                        colorTransformer(MetricsExplorerColor.color0)
                      }
                      lineSize={2}
                      name={createMetricLabel(metric)}
                      data={series.rows.map(row => ({
                        x: row.timestamp,
                        y: isNumber(row[`metric_${id}`]) ? (row[`metric_${id}`] as number) : 0,
                        y0: 0,
                      }))}
                    />
                  ))}
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

const ChartTitle = euiStyled.h4`
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;
