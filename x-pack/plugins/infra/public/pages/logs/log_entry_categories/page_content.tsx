/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import React, { useEffect } from 'react';

import { isSetupStatusWithResults } from '../../../../common/log_analysis';
import { LoadingPage } from '../../../components/loading_page';
import {
  LogAnalysisSetupStatusUnknownPrompt,
  MissingResultsPrivilegesPrompt,
  MissingSetupPrivilegesPrompt,
  MlUnavailablePrompt,
} from '../../../components/logging/log_analysis_setup';
import { useLogAnalysisCapabilitiesContext } from '../../../containers/logs/log_analysis';
import { LogEntryCategoriesResultsContent } from './page_results_content';
import { LogEntryCategoriesSetupContent } from './page_setup_content';
import { useLogEntryCategoriesModuleContext } from './use_log_entry_categories_module';

export const LogEntryCategoriesPageContent = () => {
  const {
    hasLogAnalysisCapabilites,
    hasLogAnalysisReadCapabilities,
    hasLogAnalysisSetupCapabilities,
  } = useLogAnalysisCapabilitiesContext();

  const {
    fetchJobStatus,
    fetchModuleDefinition,
    setupStatus,
  } = useLogEntryCategoriesModuleContext();

  useEffect(() => {
    if (hasLogAnalysisReadCapabilities) {
      fetchModuleDefinition();
      fetchJobStatus();
    }
  }, [fetchJobStatus, fetchModuleDefinition, hasLogAnalysisReadCapabilities]);

  if (!hasLogAnalysisCapabilites) {
    return <MlUnavailablePrompt />;
  } else if (!hasLogAnalysisReadCapabilities) {
    return <MissingResultsPrivilegesPrompt />;
  } else if (setupStatus === 'initializing') {
    return (
      <LoadingPage
        message={i18n.translate('xpack.infra.logs.logEntryCategories.jobStatusLoadingMessage', {
          defaultMessage: 'Checking status of categorization jobs...',
        })}
      />
    );
  } else if (setupStatus === 'unknown') {
    return <LogAnalysisSetupStatusUnknownPrompt retry={fetchJobStatus} />;
  } else if (isSetupStatusWithResults(setupStatus)) {
    return <LogEntryCategoriesResultsContent />;
  } else if (!hasLogAnalysisSetupCapabilities) {
    return <MissingSetupPrivilegesPrompt />;
  } else {
    return <LogEntryCategoriesSetupContent />;
  }
};
