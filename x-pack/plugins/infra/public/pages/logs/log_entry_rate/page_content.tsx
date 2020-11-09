/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import React, { memo, useEffect, useCallback } from 'react';
import { isJobStatusWithResults } from '../../../../common/log_analysis';
import { LoadingPage } from '../../../components/loading_page';
import {
  LogAnalysisSetupStatusUnknownPrompt,
  MissingResultsPrivilegesPrompt,
  MissingSetupPrivilegesPrompt,
  SubscriptionSplashContent,
} from '../../../components/logging/log_analysis_setup';
import {
  LogAnalysisSetupFlyout,
  useLogAnalysisSetupFlyoutStateContext,
} from '../../../components/logging/log_analysis_setup/setup_flyout';
import { SourceErrorPage } from '../../../components/source_error_page';
import { SourceLoadingPage } from '../../../components/source_loading_page';
import { useLogAnalysisCapabilitiesContext } from '../../../containers/logs/log_analysis';
import { useLogEntryCategoriesModuleContext } from '../../../containers/logs/log_analysis/modules/log_entry_categories';
import { useLogEntryRateModuleContext } from '../../../containers/logs/log_analysis/modules/log_entry_rate';
import { useLogSourceContext } from '../../../containers/logs/log_source';
import { LogEntryRateResultsContent } from './page_results_content';
import { LogEntryRateSetupContent } from './page_setup_content';
import { useInterval } from '../../../hooks/use_interval';

const JOB_STATUS_POLLING_INTERVAL = 30000;

export const LogEntryRatePageContent = memo(() => {
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

  const {
    fetchJobStatus: fetchLogEntryCategoriesJobStatus,
    fetchModuleDefinition: fetchLogEntryCategoriesModuleDefinition,
    jobStatus: logEntryCategoriesJobStatus,
    setupStatus: logEntryCategoriesSetupStatus,
  } = useLogEntryCategoriesModuleContext();
  const {
    fetchJobStatus: fetchLogEntryRateJobStatus,
    fetchModuleDefinition: fetchLogEntryRateModuleDefinition,
    jobStatus: logEntryRateJobStatus,
    setupStatus: logEntryRateSetupStatus,
  } = useLogEntryRateModuleContext();

  const { showModuleList } = useLogAnalysisSetupFlyoutStateContext();

  const fetchAllJobStatuses = useCallback(
    () => Promise.all([fetchLogEntryCategoriesJobStatus(), fetchLogEntryRateJobStatus()]),
    [fetchLogEntryCategoriesJobStatus, fetchLogEntryRateJobStatus]
  );

  useEffect(() => {
    if (hasLogAnalysisReadCapabilities) {
      fetchAllJobStatuses();
    }
  }, [fetchAllJobStatuses, hasLogAnalysisReadCapabilities]);

  useEffect(() => {
    if (hasLogAnalysisReadCapabilities) {
      fetchLogEntryCategoriesModuleDefinition();
    }
  }, [fetchLogEntryCategoriesModuleDefinition, hasLogAnalysisReadCapabilities]);

  useEffect(() => {
    if (hasLogAnalysisReadCapabilities) {
      fetchLogEntryRateModuleDefinition();
    }
  }, [fetchLogEntryRateModuleDefinition, hasLogAnalysisReadCapabilities]);

  useInterval(() => {
    if (logEntryCategoriesSetupStatus.type !== 'pending' && hasLogAnalysisReadCapabilities) {
      fetchLogEntryCategoriesJobStatus();
    }
    if (logEntryRateSetupStatus.type !== 'pending' && hasLogAnalysisReadCapabilities) {
      fetchLogEntryRateJobStatus();
    }
  }, JOB_STATUS_POLLING_INTERVAL);

  if (isLoading || isUninitialized) {
    return <SourceLoadingPage />;
  } else if (hasFailedLoadingSource) {
    return <SourceErrorPage errorMessage={loadSourceFailureMessage ?? ''} retry={loadSource} />;
  } else if (!hasLogAnalysisCapabilites) {
    return <SubscriptionSplashContent />;
  } else if (!hasLogAnalysisReadCapabilities) {
    return <MissingResultsPrivilegesPrompt />;
  } else if (
    logEntryCategoriesSetupStatus.type === 'initializing' ||
    logEntryRateSetupStatus.type === 'initializing'
  ) {
    return (
      <LoadingPage
        message={i18n.translate('xpack.infra.logs.analysisPage.loadingMessage', {
          defaultMessage: 'Checking status of analysis jobs...',
        })}
      />
    );
  } else if (
    logEntryCategoriesSetupStatus.type === 'unknown' ||
    logEntryRateSetupStatus.type === 'unknown'
  ) {
    return <LogAnalysisSetupStatusUnknownPrompt retry={fetchAllJobStatuses} />;
  } else if (
    isJobStatusWithResults(logEntryCategoriesJobStatus['log-entry-categories-count']) ||
    isJobStatusWithResults(logEntryRateJobStatus['log-entry-rate'])
  ) {
    return (
      <>
        <LogEntryRateResultsContent />
        <LogAnalysisSetupFlyout />
      </>
    );
  } else if (!hasLogAnalysisSetupCapabilities) {
    return <MissingSetupPrivilegesPrompt />;
  } else {
    return (
      <>
        <LogEntryRateSetupContent onOpenSetup={showModuleList} />
        <LogAnalysisSetupFlyout />
      </>
    );
  }
});
