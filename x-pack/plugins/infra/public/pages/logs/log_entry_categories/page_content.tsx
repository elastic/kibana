/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import React, { useCallback, useEffect, useState } from 'react';
import { isJobStatusWithResults } from '../../../../common/log_analysis';
import { LoadingPage } from '../../../components/loading_page';
import {
  LogAnalysisSetupStatusUnknownPrompt,
  MissingResultsPrivilegesPrompt,
  MissingSetupPrivilegesPrompt,
  SubscriptionSplashContent,
} from '../../../components/logging/log_analysis_setup';
import { SourceErrorPage } from '../../../components/source_error_page';
import { SourceLoadingPage } from '../../../components/source_loading_page';
import { useLogAnalysisCapabilitiesContext } from '../../../containers/logs/log_analysis';
import { useLogEntryCategoriesModuleContext } from '../../../containers/logs/log_analysis/modules/log_entry_categories';
import { useLogSourceContext } from '../../../containers/logs/log_source';
import { LogEntryCategoriesResultsContent } from './page_results_content';
import { LogEntryCategoriesSetupContent } from './page_setup_content';
import { LogEntryCategoriesSetupFlyout } from './setup_flyout';

export const LogEntryCategoriesPageContent = () => {
  const {
    hasFailedLoadingSource,
    isLoading,
    isUninitialized,
    loadSource,
    loadSourceFailureMessage,
  } = useLogSourceContext();

  const {
    hasLogAnalysisCapabilites,
    hasLogAnalysisReadCapabilities,
    hasLogAnalysisSetupCapabilities,
  } = useLogAnalysisCapabilitiesContext();

  const { fetchJobStatus, setupStatus, jobStatus } = useLogEntryCategoriesModuleContext();

  const [isFlyoutOpen, setIsFlyoutOpen] = useState<boolean>(false);
  const openFlyout = useCallback(() => setIsFlyoutOpen(true), []);
  const closeFlyout = useCallback(() => setIsFlyoutOpen(false), []);

  useEffect(() => {
    if (hasLogAnalysisReadCapabilities) {
      fetchJobStatus();
    }
  }, [fetchJobStatus, hasLogAnalysisReadCapabilities]);

  if (isLoading || isUninitialized) {
    return <SourceLoadingPage />;
  } else if (hasFailedLoadingSource) {
    return <SourceErrorPage errorMessage={loadSourceFailureMessage ?? ''} retry={loadSource} />;
  } else if (!hasLogAnalysisCapabilites) {
    return <SubscriptionSplashContent />;
  } else if (!hasLogAnalysisReadCapabilities) {
    return <MissingResultsPrivilegesPrompt />;
  } else if (setupStatus.type === 'initializing') {
    return (
      <LoadingPage
        message={i18n.translate('xpack.infra.logs.logEntryCategories.jobStatusLoadingMessage', {
          defaultMessage: 'Checking status of categorization jobs...',
        })}
      />
    );
  } else if (setupStatus.type === 'unknown') {
    return <LogAnalysisSetupStatusUnknownPrompt retry={fetchJobStatus} />;
  } else if (isJobStatusWithResults(jobStatus['log-entry-categories-count'])) {
    return (
      <>
        <LogEntryCategoriesResultsContent onOpenSetup={openFlyout} />
        <LogEntryCategoriesSetupFlyout isOpen={isFlyoutOpen} onClose={closeFlyout} />
      </>
    );
  } else if (!hasLogAnalysisSetupCapabilities) {
    return <MissingSetupPrivilegesPrompt />;
  } else {
    return (
      <>
        <LogEntryCategoriesSetupContent onOpenSetup={openFlyout} />
        <LogEntryCategoriesSetupFlyout isOpen={isFlyoutOpen} onClose={closeFlyout} />
      </>
    );
  }
};
