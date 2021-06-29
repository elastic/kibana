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
import { LogEntryRateModuleProvider } from '../../../containers/logs/log_analysis/modules/log_entry_rate';
import { LogFlyout } from '../../../containers/logs/log_flyout';
import { useLogSourceContext } from '../../../containers/logs/log_source';
import { useActiveKibanaSpace } from '../../../hooks/use_kibana_space';

export const LogEntryRatePageProviders: React.FunctionComponent = ({ children }) => {
  const {
    hasFailedLoading,
    isLoading,
    isUninitialized,
    latestLoadSourceFailures,
    loadSource,
    resolvedSourceConfiguration,
    sourceId,
  } = useLogSourceContext();
  const { space } = useActiveKibanaSpace();

  // This is a rather crude way of guarding the dependent providers against
  // arguments that are only made available asynchronously. Ideally, we'd use
  // React concurrent mode and Suspense in order to handle that more gracefully.
  if (space == null) {
    return null;
  } else if (isLoading || isUninitialized) {
    return <SourceLoadingPage />;
  } else if (hasFailedLoading) {
    return <LogSourceErrorPage errors={latestLoadSourceFailures} onRetry={loadSource} />;
  } else if (resolvedSourceConfiguration != null) {
    return (
      <LogFlyout.Provider>
        <LogEntryRateModuleProvider
          indexPattern={resolvedSourceConfiguration.indices}
          sourceId={sourceId}
          spaceId={space.id}
          timestampField={resolvedSourceConfiguration.timestampField}
          runtimeMappings={resolvedSourceConfiguration.runtimeMappings}
        >
          <LogEntryCategoriesModuleProvider
            indexPattern={resolvedSourceConfiguration.indices}
            sourceId={sourceId}
            spaceId={space.id}
            timestampField={resolvedSourceConfiguration.timestampField}
            runtimeMappings={resolvedSourceConfiguration.runtimeMappings}
          >
            <LogAnalysisSetupFlyoutStateProvider>{children}</LogAnalysisSetupFlyoutStateProvider>
          </LogEntryCategoriesModuleProvider>
        </LogEntryRateModuleProvider>
      </LogFlyout.Provider>
    );
  } else {
    return null;
  }
};
