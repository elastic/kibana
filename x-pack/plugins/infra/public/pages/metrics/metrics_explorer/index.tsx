/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiErrorBoundary } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useEffect, useContext } from 'react';
import { MetricsSourceConfigurationProperties } from '../../../../common/metrics_sources';
import { useTrackPageview } from '../../../../../observability/public';
import { useMetricsBreadcrumbs } from '../../../hooks/use_metrics_breadcrumbs';
import { DocumentTitle } from '../../../components/document_title';
import { NoData } from '../../../components/empty_states';
import { MetricsExplorerCharts } from './components/charts';
import { MetricsExplorerToolbar } from './components/toolbar';
import { useMetricsExplorerState } from './hooks/use_metric_explorer_state';
import { Source } from '../../../containers/metrics_source';
import { useSavedViewContext } from '../../../containers/saved_view/saved_view';
import { MetricsPageTemplate } from '../page_template';
import { metricsExplorerTitle } from '../../../translations';
import { SavedViewsToolbarControls } from '../../../components/saved_views/toolbar_control';
import { DerivedIndexPattern } from '../../../containers/metrics_source';
interface MetricsExplorerPageProps {
  source: MetricsSourceConfigurationProperties;
  derivedIndexPattern: DerivedIndexPattern;
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

  const { metricIndicesExist } = useContext(Source.Context);
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
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [loadData, shouldLoadDefault]);

  useMetricsBreadcrumbs([
    {
      text: metricsExplorerTitle,
    },
  ]);

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
      <MetricsPageTemplate
        hasData={metricIndicesExist}
        pageHeader={{
          pageTitle: metricsExplorerTitle,
          rightSideItems: [
            <SavedViewsToolbarControls
              viewState={{
                options,
                chartOptions,
                currentTimerange,
              }}
            />,
          ],
        }}
      >
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
      </MetricsPageTemplate>
    </EuiErrorBoundary>
  );
};
