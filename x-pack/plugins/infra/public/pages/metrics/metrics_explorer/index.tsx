/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiErrorBoundary } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useEffect } from 'react';
import { IIndexPattern } from 'src/plugins/data/public';
import { useTrackPageview } from '../../../../../observability/public';
import { SourceQuery } from '../../../../common/graphql/types';
import { DocumentTitle } from '../../../components/document_title';
import { NoData } from '../../../components/empty_states';
import { MetricsExplorerCharts } from './components/charts';
import { MetricsExplorerToolbar } from './components/toolbar';
import { useMetricsExplorerState } from './hooks/use_metric_explorer_state';
import { useSavedViewContext } from '../../../containers/saved_view/saved_view';

interface MetricsExplorerPageProps {
  source: SourceQuery.Query['source']['configuration'];
  derivedIndexPattern: IIndexPattern;
}

export const MetricsExplorerPage = ({ source, derivedIndexPattern }: MetricsExplorerPageProps) => {
  const {
    loading,
    error,
    data,
    currentTimerange,
    options,
    chartOptions,
    setChartOptions,
    handleAggregationChange,
    handleMetricsChange,
    handleFilterQuerySubmit,
    handleGroupByChange,
    handleTimeChange,
    handleRefresh,
    handleLoadMore,
    onViewStateChange,
    loadData,
  } = useMetricsExplorerState(source, derivedIndexPattern, false);
  const { currentView, shouldLoadDefault } = useSavedViewContext();

  useTrackPageview({ app: 'infra_metrics', path: 'metrics_explorer' });
  useTrackPageview({ app: 'infra_metrics', path: 'metrics_explorer', delay: 15000 });

  useEffect(() => {
    if (currentView) {
      onViewStateChange(currentView);
    }
  }, [currentView, onViewStateChange]);

  useEffect(() => {
    if (currentView != null || !shouldLoadDefault) {
      // load metrics explorer data after default view loaded, unless we're not loading a view
      loadData();
    }
  }, [loadData, currentView, shouldLoadDefault]);

  return (
    <EuiErrorBoundary>
      <DocumentTitle
        title={(previousTitle: string) =>
          i18n.translate('xpack.infra.infrastructureMetricsExplorerPage.documentTitle', {
            defaultMessage: '{previousTitle} | Metrics Explorer',
            values: {
              previousTitle,
            },
          })
        }
      />
      <MetricsExplorerToolbar
        derivedIndexPattern={derivedIndexPattern}
        timeRange={currentTimerange}
        options={options}
        chartOptions={chartOptions}
        onRefresh={handleRefresh}
        onTimeChange={handleTimeChange}
        onGroupByChange={handleGroupByChange}
        onFilterQuerySubmit={handleFilterQuerySubmit}
        onMetricsChange={handleMetricsChange}
        onAggregationChange={handleAggregationChange}
        onChartOptionsChange={setChartOptions}
      />
      {error ? (
        <NoData
          titleText="Whoops!"
          bodyText={i18n.translate('xpack.infra.metricsExplorer.errorMessage', {
            defaultMessage: 'It looks like the request failed with "{message}"',
            values: { message: error.message },
          })}
          onRefetch={handleRefresh}
          refetchText="Try Again"
        />
      ) : (
        <MetricsExplorerCharts
          timeRange={currentTimerange}
          loading={loading}
          data={data}
          source={source}
          options={options}
          chartOptions={chartOptions}
          onLoadMore={handleLoadMore}
          onFilter={handleFilterQuerySubmit}
          onRefetch={handleRefresh}
          onTimeChange={handleTimeChange}
        />
      )}
    </EuiErrorBoundary>
  );
};
