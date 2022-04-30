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

type StringOrNull = string | null;

interface Props {
  loading: boolean;
  options: MetricsExplorerOptions;
  chartOptions: MetricsExplorerChartOptions;
  onLoadMore: (afterKey: StringOrNull | Record<string, StringOrNull>) => void;
  onRefetch: () => void;
  onFilter: (filter: string) => void;
  onTimeChange: (start: string, end: string) => void;
  data: MetricsExplorerResponse | null;
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

  if (!data || data.series.length === 0) {
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

  return (
    <div style={{ width: '100%' }}>
      <EuiFlexGrid gutterSize="s" columns={data.series.length === 1 ? 1 : 3}>
        {data.series.map((series) => (
          <EuiFlexItem key={series.id} style={{ minWidth: 0 }}>
            <MetricsExplorerChart
              key={`chart-${series.id}`}
              onFilter={onFilter}
              options={options}
              chartOptions={chartOptions}
              title={options.groupBy ? series.id : null}
              height={data.series.length > 1 ? 200 : 400}
              series={series}
              source={source}
              timeRange={timeRange}
              onTimeChange={onTimeChange}
            />
          </EuiFlexItem>
        ))}
      </EuiFlexGrid>
      {data.series.length > 1 ? (
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <EuiHorizontalRule />
          <EuiText color="subdued">
            <p>
              <FormattedMessage
                id="xpack.infra.metricsExplorer.footerPaginationMessage"
                defaultMessage='Displaying {length} of {total} charts grouped by "{groupBy}".'
                values={{
                  length: data.series.length,
                  total: data.pageInfo.total,
                  groupBy: Array.isArray(options.groupBy)
                    ? options.groupBy.join(and)
                    : options.groupBy,
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
