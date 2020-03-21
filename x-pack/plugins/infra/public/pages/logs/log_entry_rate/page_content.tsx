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
import { SourceErrorPage } from '../../../components/source_error_page';
import { SourceLoadingPage } from '../../../components/source_loading_page';
import { useLogAnalysisCapabilitiesContext } from '../../../containers/logs/log_analysis';
import { useSourceContext } from '../../../containers/source';
import { LogEntryRateResultsContent } from './page_results_content';
import { LogEntryRateSetupContent } from './page_setup_content';
import { useLogEntryRateModuleContext } from './use_log_entry_rate_module';

export const LogEntryRatePageContent = () => {
  const {
    hasFailedLoadingSource,
    isLoadingSource,
    isUninitialized,
    loadSource,
    loadSourceFailureMessage,
  } = useSourceContext();

  const {
    hasLogAnalysisCapabilites,
    hasLogAnalysisReadCapabilities,
    hasLogAnalysisSetupCapabilities,
  } = useLogAnalysisCapabilitiesContext();

  const { fetchJobStatus, fetchModuleDefinition, setupStatus } = useLogEntryRateModuleContext();

  useEffect(() => {
    if (hasLogAnalysisReadCapabilities) {
      fetchModuleDefinition();
      fetchJobStatus();
    }
  }, [fetchJobStatus, fetchModuleDefinition, hasLogAnalysisReadCapabilities]);

  if (isLoadingSource || isUninitialized) {
    return <SourceLoadingPage />;
  } else if (hasFailedLoadingSource) {
    return <SourceErrorPage errorMessage={loadSourceFailureMessage ?? ''} retry={loadSource} />;
  } else if (!hasLogAnalysisCapabilites) {
    return <MlUnavailablePrompt />;
  } else if (!hasLogAnalysisReadCapabilities) {
    return <MissingResultsPrivilegesPrompt />;
  } else if (setupStatus === 'initializing') {
    return (
      <LoadingPage
        message={i18n.translate('xpack.infra.logs.analysisPage.loadingMessage', {
          defaultMessage: 'Checking status of analysis jobs...',
        })}
      />
    );
  } else if (setupStatus === 'unknown') {
    return <LogAnalysisSetupStatusUnknownPrompt retry={fetchJobStatus} />;
  } else if (isSetupStatusWithResults(setupStatus)) {
    return <LogEntryRateResultsContent />;
  } else if (!hasLogAnalysisSetupCapabilities) {
    return <MissingSetupPrivilegesPrompt />;
  } else {
    return <LogEntryRateSetupContent />;
  }
};
