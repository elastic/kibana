/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useLogViewContext } from '@kbn/logs-shared-plugin/public';
import { logEntryCategoriesJobType } from '../../../../common/log_analysis';
import { InlineLogViewSplashPage } from '../../../components/logging/inline_log_view_splash_page';
import { LogAnalysisSetupFlyoutStateProvider } from '../../../components/logging/log_analysis_setup/setup_flyout';
import { SourceLoadingPage } from '../../../components/source_loading_page';
import { LogEntryCategoriesModuleProvider } from '../../../containers/logs/log_analysis/modules/log_entry_categories';
import { useActiveKibanaSpace } from '../../../hooks/use_kibana_space';
import { ConnectedLogViewErrorPage } from '../shared/page_log_view_error';
import { useLogMlJobIdFormatsShimContext } from '../shared/use_log_ml_job_id_formats_shim';

export const LogEntryCategoriesPageProviders: React.FunctionComponent = ({ children }) => {
  const {
    hasFailedLoading,
    isLoading,
    isUninitialized,
    resolvedLogView,
    logViewReference,
    isPersistedLogView,
    revertToDefaultLogView,
  } = useLogViewContext();
  const { space } = useActiveKibanaSpace();
  const { idFormats, isLoadingLogAnalysisIdFormats, hasFailedLoadingLogAnalysisIdFormats } =
    useLogMlJobIdFormatsShimContext();

  // This is a rather crude way of guarding the dependent providers against
  // arguments that are only made available asynchronously. Ideally, we'd use
  // React concurrent mode and Suspense in order to handle that more gracefully.
  if (space == null) {
    return null;
  } else if (!isPersistedLogView) {
    return <InlineLogViewSplashPage revertToDefaultLogView={revertToDefaultLogView} />;
  } else if (hasFailedLoading || hasFailedLoadingLogAnalysisIdFormats) {
    return <ConnectedLogViewErrorPage />;
  } else if (isLoading || isUninitialized || isLoadingLogAnalysisIdFormats || !idFormats) {
    return <SourceLoadingPage />;
  } else if (resolvedLogView != null) {
    if (logViewReference.type === 'log-view-inline') {
      throw new Error('Logs ML features only support persisted Log View references');
    }
    return (
      <LogEntryCategoriesModuleProvider
        indexPattern={resolvedLogView.indices}
        logViewId={logViewReference.logViewId}
        spaceId={space.id}
        idFormat={idFormats[logEntryCategoriesJobType]}
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
