/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButton, EuiFlexGrid, EuiFlexItem, EuiText, EuiHorizontalRule } from '@elastic/eui';
import { FormattedMessage, InjectedIntl, injectI18n } from '@kbn/i18n/react';
import React from 'react';
import { MetricsExplorerResponse } from '../../../server/routes/metrics_explorer/types';
import {
  MetricsExplorerOptions,
  MetricsExplorerTimeOptions,
} from '../../containers/metrics_explorer/use_metrics_explorer_options';
import { InfraLoadingPanel } from '../loading';
import { NoData } from '../empty_states/no_data';
import { MetricsExplorerChart } from './chart';
import { SourceQuery } from '../../graphql/types';

interface Props {
  loading: boolean;
  options: MetricsExplorerOptions;
  onLoadMore: (afterKey: string | null) => void;
  onRefetch: () => void;
  onFilter: (filter: string) => void;
  data: MetricsExplorerResponse | null;
  intl: InjectedIntl;
  source: SourceQuery.Query['source']['configuration'] | undefined;
  timeRange: MetricsExplorerTimeOptions;
}
export const MetricsExplorerCharts = injectI18n(
  ({ loading, data, onLoadMore, options, onRefetch, intl, onFilter, source, timeRange }: Props) => {
    if (!data && loading) {
      return (
        <InfraLoadingPanel
          height={800}
          width="100%"
          text={intl.formatMessage({
            defaultMessage: 'Loading charts',
            id: 'xpack.infra.metricsExplorer.loadingCharts',
          })}
        />
      );
    }

    if (!data || data.series.length === 0) {
      return (
        <NoData
          titleText={intl.formatMessage({
            id: 'xpack.infra.metricsExplorer.noDataTitle',
            defaultMessage: 'There is no data to display.',
          })}
          bodyText={intl.formatMessage({
            id: 'xpack.infra.metricsExplorer.noDataBodyText',
            defaultMessage: 'Try adjusting your time, filters or group by settings.',
          })}
          refetchText={intl.formatMessage({
            id: 'xpack.infra.metricsExplorer.noDataRefetchText',
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
              <MetricsExplorerChart
                key={`chart-${series.id}`}
                onFilter={onFilter}
                options={options}
                title={options.groupBy ? series.id : null}
                height={data.series.length > 1 ? 200 : 400}
                series={series}
                source={source}
                timeRange={timeRange}
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
  }
);
