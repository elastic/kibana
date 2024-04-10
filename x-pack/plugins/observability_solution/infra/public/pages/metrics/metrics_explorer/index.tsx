/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiErrorBoundary } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useEffect, useState } from 'react';
import { useTrackPageview, FeatureFeedbackButton } from '@kbn/observability-shared-plugin/public';
import { useKibanaEnvironmentContext } from '../../../hooks/use_kibana';
import { SourceLoadingPage } from '../../../components/source_loading_page';
import { useMetricsExplorerViews } from '../../../hooks/use_metrics_explorer_views';
import { MetricsSourceConfigurationProperties } from '../../../../common/metrics_sources';
import { useMetricsBreadcrumbs } from '../../../hooks/use_metrics_breadcrumbs';
import { NoData, NoRemoteCluster } from '../../../components/empty_states';
import { MetricsExplorerCharts } from './components/charts';
import { MetricsExplorerToolbar } from './components/toolbar';
import { useMetricsExplorerState } from './hooks/use_metric_explorer_state';
import { useSourceContext } from '../../../containers/metrics_source';
import { MetricsPageTemplate } from '../page_template';
import { metricsExplorerTitle } from '../../../translations';
import { DerivedIndexPattern } from '../../../containers/metrics_source';
import { SavedViews } from './components/saved_views';

interface MetricsExplorerPageProps {
  source: MetricsSourceConfigurationProperties;
  derivedIndexPattern: DerivedIndexPattern;
}

const METRICS_EXPLORER_FEEDBACK_URL = 'https://ela.st/survey-infra-metricsexplorer?usp=pp_url';

export const MetricsExplorerPage = ({ source, derivedIndexPattern }: MetricsExplorerPageProps) => {
  const [enabled, setEnabled] = useState(false);
  const {
    isLoading,
    error,
    data,
    timeRange,
    options,
    chartOptions,
    setChartOptions,
    handleAggregationChange,
    handleMetricsChange,
    handleFilterQuerySubmit,
    handleGroupByChange,
    handleTimeChange,
    handleLoadMore,
    onViewStateChange,
    refresh,
  } = useMetricsExplorerState(source, derivedIndexPattern, enabled);
  const { currentView } = useMetricsExplorerViews();
  const { source: sourceContext, metricIndicesExist } = useSourceContext();
  const { kibanaVersion, isCloudEnv, isServerlessEnv } = useKibanaEnvironmentContext();

  useTrackPageview({ app: 'infra_metrics', path: 'metrics_explorer' });
  useTrackPageview({ app: 'infra_metrics', path: 'metrics_explorer', delay: 15000 });

  const { remoteClustersExist } = sourceContext?.status ?? {};

  useEffect(() => {
    if (currentView) {
      onViewStateChange(currentView);
    }
  }, [currentView, onViewStateChange]);

  useEffect(() => {
    if (currentView != null) {
      // load metrics explorer data after default view loaded, unless we're not isLoading a view
      setEnabled(true);
    }
  }, [currentView]);

  useMetricsBreadcrumbs([
    {
      text: metricsExplorerTitle,
    },
  ]);

  const viewState = {
    options,
    chartOptions,
    currentTimerange: timeRange,
  };

  if (isLoading && !sourceContext) return <SourceLoadingPage />;

  if (!remoteClustersExist) {
    return <NoRemoteCluster />;
  }

  return (
    <EuiErrorBoundary>
      <MetricsPageTemplate
        hasData={metricIndicesExist}
        pageHeader={{
          pageTitle: metricsExplorerTitle,
          rightSideItems: [
            <SavedViews viewState={viewState} />,
            <FeatureFeedbackButton
              formUrl={METRICS_EXPLORER_FEEDBACK_URL}
              data-test-subj="infraMetricsExplorerFeedbackLink"
              kibanaVersion={kibanaVersion}
              isCloudEnv={isCloudEnv}
              isServerlessEnv={isServerlessEnv}
            />,
          ],
        }}
      >
        <MetricsExplorerToolbar
          derivedIndexPattern={derivedIndexPattern}
          timeRange={timeRange}
          options={options}
          chartOptions={chartOptions}
          onRefresh={refresh}
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
            onRefetch={refresh}
            refetchText="Try Again"
          />
        ) : (
          <MetricsExplorerCharts
            timeRange={timeRange}
            isLoading={isLoading}
            data={data}
            source={source}
            options={options}
            chartOptions={chartOptions}
            onLoadMore={handleLoadMore}
            onFilter={handleFilterQuerySubmit}
            onRefetch={refresh}
            onTimeChange={handleTimeChange}
          />
        )}
      </MetricsPageTemplate>
    </EuiErrorBoundary>
  );
};
