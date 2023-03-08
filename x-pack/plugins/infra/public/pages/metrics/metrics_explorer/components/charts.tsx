/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiFlexGrid, EuiFlexItem, EuiText, EuiHorizontalRule } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';
import { MetricsSourceConfigurationProperties } from '../../../../../common/metrics_sources';
import { MetricsExplorerResponse } from '../../../../../common/http_api/metrics_explorer';
import {
  MetricsExplorerOptions,
  MetricsExplorerTimeOptions,
  MetricsExplorerChartOptions,
} from '../hooks/use_metrics_explorer_options';
import { InfraLoadingPanel } from '../../../../components/loading';
import { NoData } from '../../../../components/empty_states/no_data';
import { MetricsExplorerChart } from './chart';

interface Props {
  loading: boolean;
  options: MetricsExplorerOptions;
  chartOptions: MetricsExplorerChartOptions;
  onLoadMore: () => void;
  onRefetch: () => void;
  onFilter: (filter: string) => void;
  onTimeChange: (start: string, end: string) => void;
  data?: {
    pages: MetricsExplorerResponse[];
  };
  source: MetricsSourceConfigurationProperties | undefined;
  timeRange: MetricsExplorerTimeOptions;
}
export const MetricsExplorerCharts = ({
  loading,
  data,
  onLoadMore,
  options,
  chartOptions,
  onRefetch,

  onFilter,
  source,
  timeRange,
  onTimeChange,
}: Props) => {
  if (loading) {
    return (
      <InfraLoadingPanel
        height={800}
        width="100%"
        text={i18n.translate('xpack.infra.metricsExplorer.loadingCharts', {
          defaultMessage: 'Loading charts',
        })}
      />
    );
  }

  // TODO Improve checking existence of data
  if (!data || data.pages[0].series.length === 0) {
    return (
      <NoData
        titleText={i18n.translate('xpack.infra.metricsExplorer.noDataTitle', {
          defaultMessage: 'There is no data to display.',
        })}
        bodyText={i18n.translate('xpack.infra.metricsExplorer.noDataBodyText', {
          defaultMessage: 'Try adjusting your time, filters or group by settings.',
        })}
        refetchText={i18n.translate('xpack.infra.metricsExplorer.noDataRefetchText', {
          defaultMessage: 'Check for new data',
        })}
        testString="metrics-explorer-no-data"
        onRefetch={onRefetch}
      />
    );
  }

  const and = i18n.translate('xpack.infra.metricsExplorer.andLabel', { defaultMessage: '" and "' });
  const lastPageIndex = data.pages.length - 1;

  return (
    <div style={{ width: '100%' }}>
      <EuiFlexGrid gutterSize="s" columns={data.pages[0].series.length === 1 ? 1 : 3}>
        {data.pages.map((page) =>
          page.series.map((series) => (
            <EuiFlexItem key={series.id} style={{ minWidth: 0 }}>
              <MetricsExplorerChart
                key={`chart-${series.id}`}
                onFilter={onFilter}
                options={options}
                chartOptions={chartOptions}
                title={options.groupBy ? series.id : null}
                height={page.series.length > 1 ? 200 : 400}
                series={series}
                source={source}
                timeRange={timeRange}
                onTimeChange={onTimeChange}
              />
            </EuiFlexItem>
          ))
        )}
      </EuiFlexGrid>
      {data.pages[0].series.length > 1 ? (
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <EuiHorizontalRule />
          <EuiText color="subdued">
            <p>
              <FormattedMessage
                id="xpack.infra.metricsExplorer.footerPaginationMessage"
                defaultMessage='Displaying {length} of {total} charts grouped by "{groupBy}".'
                values={{
                  length: data.pages[0].series.length,
                  total: data.pages[0].pageInfo.total,
                  groupBy: Array.isArray(options.groupBy)
                    ? options.groupBy.join(and)
                    : options.groupBy,
                }}
              />
            </p>
          </EuiText>
          {data?.pages[lastPageIndex].pageInfo.afterKey ? (
            <div style={{ margin: '16px 0' }}>
              <EuiButton isLoading={loading} size="s" onClick={onLoadMore}>
                <FormattedMessage
                  id="xpack.infra.metricsExplorer.loadMoreChartsButton"
                  defaultMessage="Load More Charts"
                />
              </EuiButton>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
};
