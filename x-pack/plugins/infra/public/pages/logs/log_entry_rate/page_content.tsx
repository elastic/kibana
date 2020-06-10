/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import React, { useEffect, useMemo } from 'react';
import { isJobStatusWithResults } from '../../../../common/log_analysis';
import { LoadingPage } from '../../../components/loading_page';
import {
  LogAnalysisSetupStatusUnknownPrompt,
  MissingResultsPrivilegesPrompt,
  MissingSetupPrivilegesPrompt,
  MlUnavailablePrompt,
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

  const { fetchJobStatus, setupStatus, jobStatus, hideSetup } = useLogEntryRateModuleContext();

  const isFlyoutOpen = useMemo<boolean>(() => {
    switch (setupStatus.type) {
      case 'required':
      case 'pending':
      case 'succeeded':
        return true;
      default:
        return false;
    }
  }, [setupStatus]);

  useEffect(() => {
    if (hasLogAnalysisReadCapabilities) {
      fetchJobStatus();
    }
  }, [fetchJobStatus, hasLogAnalysisReadCapabilities]);

  let pageContent;

  if (isLoading || isUninitialized) {
    pageContent = <SourceLoadingPage />;
  } else if (hasFailedLoadingSource) {
    pageContent = (
      <SourceErrorPage errorMessage={loadSourceFailureMessage ?? ''} retry={loadSource} />
    );
  } else if (!hasLogAnalysisCapabilites) {
    pageContent = <MlUnavailablePrompt />;
  } else if (!hasLogAnalysisReadCapabilities) {
    pageContent = <MissingResultsPrivilegesPrompt />;
  } else if (setupStatus.type === 'initializing') {
    pageContent = (
      <LoadingPage
        message={i18n.translate('xpack.infra.logs.analysisPage.loadingMessage', {
          defaultMessage: 'Checking status of analysis jobs...',
        })}
      />
    );
  } else if (setupStatus.type === 'unknown') {
    pageContent = <LogAnalysisSetupStatusUnknownPrompt retry={fetchJobStatus} />;
  } else if (isJobStatusWithResults(jobStatus['log-entry-rate'])) {
    pageContent = <LogEntryRateResultsContent />;
  } else if (!hasLogAnalysisSetupCapabilities) {
    pageContent = <MissingSetupPrivilegesPrompt />;
  } else {
    pageContent = <LogEntryRateSetupContent />;
  }

  return (
    <>
      <LogEntryRateSetupFlyout isOpen={isFlyoutOpen} onClose={hideSetup} />
      {pageContent}
    </>
  );
};
