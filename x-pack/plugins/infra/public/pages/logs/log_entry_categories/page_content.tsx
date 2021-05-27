/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React, { useCallback, useEffect } from 'react';
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
import { SubscriptionSplashContent } from '../../../components/subscription_splash_content';
import { useLogAnalysisCapabilitiesContext } from '../../../containers/logs/log_analysis';
import { useLogEntryCategoriesModuleContext } from '../../../containers/logs/log_analysis/modules/log_entry_categories';
import { LogEntryCategoriesResultsContent } from './page_results_content';
import { LogEntryCategoriesSetupContent } from './page_setup_content';
import { useKibanaContextForPlugin } from '../../../hooks/use_kibana';
import type { LazyObservabilityPageTemplateProps } from '../../../../../observability/public';

const logCategoriesTabTitle = i18n.translate('xpack.infra.logs.logCategoriesTitle', {
  defaultMessage: 'Categories',
});

export const LogEntryCategoriesPageContent = () => {
  const {
    services: {
      observability: {
        navigation: { PageTemplate },
      },
    },
  } = useKibanaContextForPlugin();

  const {
    hasLogAnalysisCapabilites,
    hasLogAnalysisReadCapabilities,
    hasLogAnalysisSetupCapabilities,
  } = useLogAnalysisCapabilitiesContext();

  const { fetchJobStatus, setupStatus, jobStatus } = useLogEntryCategoriesModuleContext();

  const { showModuleSetup } = useLogAnalysisSetupFlyoutStateContext();
  const showCategoriesModuleSetup = useCallback(() => showModuleSetup('logs_ui_categories'), [
    showModuleSetup,
  ]);

  useEffect(() => {
    if (hasLogAnalysisReadCapabilities) {
      fetchJobStatus();
    }
  }, [fetchJobStatus, hasLogAnalysisReadCapabilities]);

  if (!hasLogAnalysisCapabilites) {
    return (
      <CategoriesPageTemplate PageTemplate={PageTemplate} isEmptyState={true}>
        <SubscriptionSplashContent />
      </CategoriesPageTemplate>
    );
  } else if (!hasLogAnalysisReadCapabilities) {
    return (
      <CategoriesPageTemplate PageTemplate={PageTemplate} isEmptyState={true}>
        <MissingResultsPrivilegesPrompt />
      </CategoriesPageTemplate>
    );
  } else if (setupStatus.type === 'initializing') {
    return (
      <CategoriesPageTemplate PageTemplate={PageTemplate} isEmptyState={true}>
        <LoadingPage
          message={i18n.translate('xpack.infra.logs.logEntryCategories.jobStatusLoadingMessage', {
            defaultMessage: 'Checking status of categorization jobs...',
          })}
        />
      </CategoriesPageTemplate>
    );
  } else if (setupStatus.type === 'unknown') {
    return (
      <CategoriesPageTemplate PageTemplate={PageTemplate} isEmptyState={true}>
        <LogAnalysisSetupStatusUnknownPrompt retry={fetchJobStatus} />
      </CategoriesPageTemplate>
    );
  } else if (isJobStatusWithResults(jobStatus['log-entry-categories-count'])) {
    return (
      <CategoriesPageTemplate PageTemplate={PageTemplate}>
        <LogEntryCategoriesResultsContent onOpenSetup={showCategoriesModuleSetup} />
        <LogAnalysisSetupFlyout allowedModules={allowedSetupModules} />
      </CategoriesPageTemplate>
    );
  } else if (!hasLogAnalysisSetupCapabilities) {
    return (
      <CategoriesPageTemplate PageTemplate={PageTemplate} isEmptyState={true}>
        <MissingSetupPrivilegesPrompt />
      </CategoriesPageTemplate>
    );
  } else {
    return (
      <CategoriesPageTemplate PageTemplate={PageTemplate} isEmptyState={true}>
        <LogEntryCategoriesSetupContent onOpenSetup={showCategoriesModuleSetup} />
        <LogAnalysisSetupFlyout allowedModules={allowedSetupModules} />
      </CategoriesPageTemplate>
    );
  }
};

const allowedSetupModules = ['logs_ui_categories' as const];

const CategoriesPageTemplate: React.FC<{
  PageTemplate: React.ComponentType<LazyObservabilityPageTemplateProps>;
  isEmptyState?: boolean;
}> = ({ PageTemplate, isEmptyState = false, children }) => {
  return (
    <PageTemplate
      data-test-subj="logsLogEntryCategoriesPage"
      isEmptyState={isEmptyState}
      pageHeader={{
        pageTitle: logCategoriesTabTitle,
      }}
    >
      {children}
    </PageTemplate>
  );
};
