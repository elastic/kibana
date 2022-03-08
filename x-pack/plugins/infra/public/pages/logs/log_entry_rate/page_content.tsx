/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React, { memo, useCallback, useEffect } from 'react';
import useInterval from 'react-use/lib/useInterval';
import type { LazyObservabilityPageTemplateProps } from '../../../../../observability/public';
import { isJobStatusWithResults } from '../../../../common/log_analysis';
import { LoadingPage } from '../../../components/loading_page';
import {
  LogAnalysisSetupStatusUnknownPrompt,
  MissingResultsPrivilegesPrompt,
  MissingSetupPrivilegesPrompt,
} from '../../../components/logging/log_analysis_setup';
import {
  LogAnalysisSetupFlyout,
  useLogAnalysisSetupFlyoutStateContext,
} from '../../../components/logging/log_analysis_setup/setup_flyout';
import { SubscriptionSplashPage } from '../../../components/subscription_splash_content';
import { useLogAnalysisCapabilitiesContext } from '../../../containers/logs/log_analysis';
import { useLogEntryCategoriesModuleContext } from '../../../containers/logs/log_analysis/modules/log_entry_categories';
import { useLogEntryRateModuleContext } from '../../../containers/logs/log_analysis/modules/log_entry_rate';
import { useLogViewContext } from '../../../hooks/use_log_view';
import { LogsPageTemplate } from '../page_template';
import { LogEntryRateResultsContent } from './page_results_content';
import { LogEntryRateSetupContent } from './page_setup_content';

const JOB_STATUS_POLLING_INTERVAL = 30000;

const anomaliesTitle = i18n.translate('xpack.infra.logs.anomaliesPageTitle', {
  defaultMessage: 'Anomalies',
});

export const LogEntryRatePageContent = memo(() => {
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

  if (!hasLogAnalysisCapabilites) {
    return (
      <SubscriptionSplashPage
        data-test-subj="logsLogEntryRatePage"
        pageHeader={{
          pageTitle: anomaliesTitle,
        }}
      />
    );
  } else if (!hasLogAnalysisReadCapabilities) {
    return (
      <AnomaliesPageTemplate isEmptyState={true}>
        <MissingResultsPrivilegesPrompt />
      </AnomaliesPageTemplate>
    );
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
    return (
      <AnomaliesPageTemplate isEmptyState={true}>
        <LogAnalysisSetupStatusUnknownPrompt retry={fetchAllJobStatuses} />
      </AnomaliesPageTemplate>
    );
  } else if (
    isJobStatusWithResults(logEntryCategoriesJobStatus['log-entry-categories-count']) ||
    isJobStatusWithResults(logEntryRateJobStatus['log-entry-rate'])
  ) {
    return (
      <>
        <LogEntryRateResultsContent pageTitle={anomaliesTitle} />
        <LogAnalysisSetupFlyout />
      </>
    );
  } else if (!hasLogAnalysisSetupCapabilities) {
    return (
      <AnomaliesPageTemplate isEmptyState={true}>
        <MissingSetupPrivilegesPrompt />;
      </AnomaliesPageTemplate>
    );
  } else {
    return (
      <>
        <AnomaliesPageTemplate isEmptyState={true}>
          <LogEntryRateSetupContent onOpenSetup={showModuleList} />
        </AnomaliesPageTemplate>
        <LogAnalysisSetupFlyout />
      </>
    );
  }
});

const AnomaliesPageTemplate: React.FC<LazyObservabilityPageTemplateProps> = ({
  children,
  ...rest
}) => {
  const { logViewStatus } = useLogViewContext();
  return (
    <LogsPageTemplate
      hasData={logViewStatus?.index !== 'missing'}
      data-test-subj="logsLogEntryRatePage"
      pageHeader={
        rest.isEmptyState
          ? undefined
          : {
              pageTitle: anomaliesTitle,
            }
      }
      {...rest}
    >
      {children}
    </LogsPageTemplate>
  );
};
