/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiErrorBoundary } from '@elastic/eui';
import React from 'react';
import { useTrackPageview } from '@kbn/observability-plugin/public';
import { APP_WRAPPER_CLASS } from '@kbn/core/public';

import { SourceErrorPage } from '../../../components/source_error_page';
import { SourceLoadingPage } from '../../../components/source_loading_page';
import { useSourceContext } from '../../../containers/metrics_source';
import { useMetricsBreadcrumbs } from '../../../hooks/use_metrics_breadcrumbs';
import { MetricsPageTemplate } from '../page_template';
import { hostsTitle } from '../../../translations';
import { HostsContent } from './hosts_content';
import { MetricsDataViewProvider } from './hooks/use_data_view';
import { fullHeightContentStyles } from '../../../page_template.styles';

export const HostsPage = () => {
  const {
    hasFailedLoadingSource,
    isLoading,
    loadSourceFailureMessage,
    loadSource,
    source,
    metricIndicesExist,
  } = useSourceContext();
  useTrackPageview({ app: 'infra_metrics', path: 'hosts' });
  useTrackPageview({ app: 'infra_metrics', path: 'hosts', delay: 15000 });

  useMetricsBreadcrumbs([
    {
      text: hostsTitle,
    },
  ]);
  return (
    <EuiErrorBoundary>
      {isLoading && !source ? (
        <SourceLoadingPage />
      ) : metricIndicesExist && source ? (
        <>
          <div className={APP_WRAPPER_CLASS}>
            <MetricsPageTemplate
              hasData={metricIndicesExist}
              pageHeader={{
                pageTitle: hostsTitle,
              }}
              pageSectionProps={{
                contentProps: {
                  css: fullHeightContentStyles,
                },
              }}
            >
              <MetricsDataViewProvider metricAlias={source.configuration.metricAlias}>
                <HostsContent />
              </MetricsDataViewProvider>
            </MetricsPageTemplate>
          </div>
        </>
      ) : hasFailedLoadingSource ? (
        <SourceErrorPage errorMessage={loadSourceFailureMessage || ''} retry={loadSource} />
      ) : (
        <MetricsPageTemplate hasData={metricIndicesExist} data-test-subj="noMetricsIndicesPrompt" />
      )}
    </EuiErrorBoundary>
  );
};
