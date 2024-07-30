/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React, { useEffect, useState } from 'react';
import { useTrackPageview, FeatureFeedbackButton } from '@kbn/observability-shared-plugin/public';
import { InfraPageTemplate } from '../../../components/shared/templates/infra_page_template';
import { WithMetricsExplorerOptionsUrlState } from '../../../containers/metrics_explorer/with_metrics_explorer_options_url_state';
import { useKibanaEnvironmentContext } from '../../../hooks/use_kibana';
import { useMetricsExplorerViews } from '../../../hooks/use_metrics_explorer_views';
import { useMetricsBreadcrumbs } from '../../../hooks/use_metrics_breadcrumbs';
import { NoData } from '../../../components/empty_states';
import { MetricsExplorerCharts } from './components/charts';
import { MetricsExplorerToolbar } from './components/toolbar';
import { useMetricsExplorerState } from './hooks/use_metric_explorer_state';
import { metricsExplorerTitle } from '../../../translations';
import { SavedViews } from './components/saved_views';
import { MetricsExplorerOptionsContainer } from './hooks/use_metrics_explorer_options';

const METRICS_EXPLORER_FEEDBACK_URL = 'https://ela.st/survey-infra-metricsexplorer?usp=pp_url';

export const MetricsExplorerPage = () => {
  useTrackPageview({ app: 'infra_metrics', path: 'metrics_explorer' });
  useTrackPageview({ app: 'infra_metrics', path: 'metrics_explorer', delay: 15000 });

  useMetricsBreadcrumbs([
    {
      text: metricsExplorerTitle,
    },
  ]);

  return (
    <MetricsExplorerOptionsContainer>
      <WithMetricsExplorerOptionsUrlState />
      <MetricsExplorerContent />
    </MetricsExplorerOptionsContainer>
  );
};

const MetricsExplorerContent = () => {
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
  } = useMetricsExplorerState({ enabled });
  const { currentView } = useMetricsExplorerViews();

  const { kibanaVersion, isCloudEnv, isServerlessEnv } = useKibanaEnvironmentContext();

  useTrackPageview({ app: 'infra_metrics', path: 'metrics_explorer' });
  useTrackPageview({ app: 'infra_metrics', path: 'metrics_explorer', delay: 15000 });

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

  return (
    <InfraPageTemplate
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
          options={options}
          chartOptions={chartOptions}
          onLoadMore={handleLoadMore}
          onFilter={handleFilterQuerySubmit}
          onRefetch={refresh}
          onTimeChange={handleTimeChange}
        />
      )}
    </InfraPageTemplate>
  );
};
