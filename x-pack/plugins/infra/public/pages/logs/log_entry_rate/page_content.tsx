/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import React, { useEffect, useState, useCallback } from 'react';
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
import { useLogSourceContext } from '../../../containers/logs/log_source';
import { LogEntryRateResultsContent } from './page_results_content';
import { LogEntryRateSetupContent } from './page_setup_content';
import { useLogEntryRateModuleContext } from './use_log_entry_rate_module';
import { LogEntryRateSetupFlyout } from './setup_flyout';

export const LogEntryRatePageContent = () => {
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

  const { fetchJobStatus, setupStatus, jobStatus } = useLogEntryRateModuleContext();

  const [isFlyoutOpen, setIsFlyoutOpen] = useState<boolean>(false);
  const openFlyout = useCallback(() => setIsFlyoutOpen(true), []);
  const closeFlyout = useCallback(() => setIsFlyoutOpen(false), []);

  useEffect(() => {
    if (hasLogAnalysisReadCapabilities) {
      fetchJobStatus();
    }
  }, [fetchJobStatus, hasLogAnalysisReadCapabilities]);

  // Open flyout if there are no ML jobs
  useEffect(() => {
    if (setupStatus.type === 'required' && setupStatus.reason === 'missing') {
      openFlyout();
    }
  }, [setupStatus, openFlyout]);

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
        message={i18n.translate('xpack.infra.logs.analysisPage.loadingMessage', {
          defaultMessage: 'Checking status of analysis jobs...',
        })}
      />
    );
  } else if (setupStatus.type === 'unknown') {
    return <LogAnalysisSetupStatusUnknownPrompt retry={fetchJobStatus} />;
  } else if (isJobStatusWithResults(jobStatus['log-entry-rate'])) {
    return (
      <>
        <LogEntryRateResultsContent onOpenSetup={openFlyout} />
        <LogEntryRateSetupFlyout isOpen={isFlyoutOpen} onClose={closeFlyout} />
      </>
    );
  } else if (!hasLogAnalysisSetupCapabilities) {
    return <MissingSetupPrivilegesPrompt />;
  } else {
    return (
      <>
        <LogEntryRateSetupContent onOpenSetup={openFlyout} />
        <LogEntryRateSetupFlyout isOpen={isFlyoutOpen} onClose={closeFlyout} />
      </>
    );
  }
};
