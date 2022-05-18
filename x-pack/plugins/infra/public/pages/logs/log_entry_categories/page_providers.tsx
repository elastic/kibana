/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { LogAnalysisSetupFlyoutStateProvider } from '../../../components/logging/log_analysis_setup/setup_flyout';
import { LogSourceErrorPage } from '../../../components/logging/log_source_error_page';
import { SourceLoadingPage } from '../../../components/source_loading_page';
import { LogEntryCategoriesModuleProvider } from '../../../containers/logs/log_analysis/modules/log_entry_categories';
import { useActiveKibanaSpace } from '../../../hooks/use_kibana_space';
import { useLogViewContext } from '../../../hooks/use_log_view';

export const LogEntryCategoriesPageProviders: React.FunctionComponent = ({ children }) => {
  const {
    hasFailedLoading,
    isLoading,
    isUninitialized,
    latestLoadLogViewFailures,
    load,
    resolvedLogView,
    logViewId,
  } = useLogViewContext();
  const { space } = useActiveKibanaSpace();

  // This is a rather crude way of guarding the dependent providers against
  // arguments that are only made available asynchronously. Ideally, we'd use
  // React concurrent mode and Suspense in order to handle that more gracefully.
  if (space == null) {
    return null;
  } else if (hasFailedLoading) {
    return <LogSourceErrorPage errors={latestLoadLogViewFailures} onRetry={load} />;
  } else if (isLoading || isUninitialized) {
    return <SourceLoadingPage />;
  } else if (resolvedLogView != null) {
    return (
      <LogEntryCategoriesModuleProvider
        indexPattern={resolvedLogView.indices}
        sourceId={logViewId}
        spaceId={space.id}
        timestampField={resolvedLogView.timestampField}
        runtimeMappings={resolvedLogView.runtimeMappings}
      >
        <LogAnalysisSetupFlyoutStateProvider>{children}</LogAnalysisSetupFlyoutStateProvider>
      </LogEntryCategoriesModuleProvider>
    );
  } else {
    return null;
  }
};
