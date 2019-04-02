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
import { MetricsExplorerResponse } from 'x-pack/plugins/infra/server/routes/metrics_explorer/types';
import { MetricsExplorerOptions } from '../../containers/metrics_explorer/use_metrics_explorer_options';
import { NoData } from '../empty_states/no_data';
import { InfraLoadingPanel } from '../loading';

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
            <EuiFlexItem key={series.id} style={{ padding: 16 }}>
              {data.series.length > 1 ? (
                <EuiTitle size="xs">
                  <h4>{series.id}</h4>
                </EuiTitle>
              ) : null}
              <div style={{ height: data.series.length > 1 ? 200 : 400 }}>
                <EuiSeriesChart animateData={false} xType="time">
                  <EuiAreaSeries
                    color="#3185FC"
                    lineSize={2}
                    fillOpacity={0.5}
                    name={`${series.id}-metric_0`}
                    data={series.rows.map(row => ({
                      x: row.timestamp,
                      y: isNumber(row.metric_0) ? row.metric_0 : 0,
                      y0: 0,
                    }))}
                  />
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
