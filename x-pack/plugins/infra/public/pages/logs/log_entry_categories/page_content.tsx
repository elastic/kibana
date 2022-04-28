/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React, { useCallback, useEffect } from 'react';
import type { LazyObservabilityPageTemplateProps } from '@kbn/observability-plugin/public';
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
import { useLogViewContext } from '../../../hooks/use_log_view';
import { LogsPageTemplate } from '../page_template';
import { LogEntryCategoriesResultsContent } from './page_results_content';
import { LogEntryCategoriesSetupContent } from './page_setup_content';

const logCategoriesTitle = i18n.translate('xpack.infra.logs.logCategoriesTitle', {
  defaultMessage: 'Categories',
});

export const LogEntryCategoriesPageContent = () => {
  const {
    hasLogAnalysisCapabilites,
    hasLogAnalysisReadCapabilities,
    hasLogAnalysisSetupCapabilities,
  } = useLogAnalysisCapabilitiesContext();

  const { fetchJobStatus, setupStatus, jobStatus } = useLogEntryCategoriesModuleContext();

  const { showModuleSetup } = useLogAnalysisSetupFlyoutStateContext();
  const showCategoriesModuleSetup = useCallback(
    () => showModuleSetup('logs_ui_categories'),
    [showModuleSetup]
  );

  useEffect(() => {
    if (hasLogAnalysisReadCapabilities) {
      fetchJobStatus();
    }
  }, [fetchJobStatus, hasLogAnalysisReadCapabilities]);

  if (!hasLogAnalysisCapabilites) {
    return (
      <SubscriptionSplashPage
        data-test-subj="logsLogEntryCategoriesPage"
        pageHeader={{
          pageTitle: logCategoriesTitle,
        }}
      />
    );
  } else if (!hasLogAnalysisReadCapabilities) {
    return (
      <CategoriesPageTemplate isEmptyState={true}>
        <MissingResultsPrivilegesPrompt />
      </CategoriesPageTemplate>
    );
  } else if (setupStatus.type === 'initializing') {
    return (
      <LoadingPage
        message={i18n.translate('xpack.infra.logs.logEntryCategories.jobStatusLoadingMessage', {
          defaultMessage: 'Checking status of categorization jobs...',
        })}
      />
    );
  } else if (setupStatus.type === 'unknown') {
    return (
      <CategoriesPageTemplate isEmptyState={true}>
        <LogAnalysisSetupStatusUnknownPrompt retry={fetchJobStatus} />
      </CategoriesPageTemplate>
    );
  } else if (isJobStatusWithResults(jobStatus['log-entry-categories-count'])) {
    return (
      <>
        <LogEntryCategoriesResultsContent
          onOpenSetup={showCategoriesModuleSetup}
          pageTitle={logCategoriesTitle}
        />
        <LogAnalysisSetupFlyout allowedModules={allowedSetupModules} />
      </>
    );
  } else if (!hasLogAnalysisSetupCapabilities) {
    return (
      <CategoriesPageTemplate isEmptyState={true}>
        <MissingSetupPrivilegesPrompt />
      </CategoriesPageTemplate>
    );
  } else {
    return (
      <>
        <CategoriesPageTemplate isEmptyState={true}>
          <LogEntryCategoriesSetupContent onOpenSetup={showCategoriesModuleSetup} />
        </CategoriesPageTemplate>
        <LogAnalysisSetupFlyout allowedModules={allowedSetupModules} />
      </>
    );
  }
};

const allowedSetupModules = ['logs_ui_categories' as const];

const CategoriesPageTemplate: React.FC<LazyObservabilityPageTemplateProps> = ({
  children,
  ...rest
}) => {
  const { logViewStatus } = useLogViewContext();
  return (
    <LogsPageTemplate
      hasData={logViewStatus?.index !== 'missing'}
      data-test-subj="logsLogEntryCategoriesPage"
      pageHeader={
        rest.isEmptyState
          ? undefined
          : {
              pageTitle: logCategoriesTitle,
            }
      }
      {...rest}
    >
      {children}
    </LogsPageTemplate>
  );
};
