/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, PropsWithChildren } from 'react';
import { useLogSourcesContext } from '@kbn/logs-data-access-plugin/public';
import { logEntryCategoriesJobType, logEntryRateJobType } from '../../../../common/log_analysis';
import { LogAnalysisSetupFlyoutStateProvider } from '../../../components/logging/log_analysis_setup/setup_flyout';
import { SourceLoadingPage } from '../../../components/source_loading_page';
import { LogEntryCategoriesModuleProvider } from '../../../containers/logs/log_analysis/modules/log_entry_categories';
import { LogEntryRateModuleProvider } from '../../../containers/logs/log_analysis/modules/log_entry_rate';
import { LogEntryFlyoutProvider } from '../../../containers/logs/log_flyout';
import { useActiveKibanaSpace } from '../../../hooks/use_kibana_space';
import { LogSourceErrorPage } from '../shared/page_log_view_error';
import { useLogMlJobIdFormatsShimContext } from '../shared/use_log_ml_job_id_formats_shim';

const TIMESTAMP_FIELD = '@timestamp';
const DEFAULT_MODULE_SOURCE_CONFIGURATION_ID = 'default'; // NOTE: Left in for legacy reasons, this used to refer to a log view ID (legacy).

export const LogEntryRatePageProviders: FC<PropsWithChildren<unknown>> = ({ children }) => {
  const {
    logSources,
    isLoadingLogSources,
    isUninitialized,
    hasFailedLoadingLogSources,
    logSourcesError,
    combinedIndices,
  } = useLogSourcesContext();
  const { space } = useActiveKibanaSpace();

  const { idFormats, isLoadingLogAnalysisIdFormats, hasFailedLoadingLogAnalysisIdFormats } =
    useLogMlJobIdFormatsShimContext();

  // This is a rather crude way of guarding the dependent providers against
  // arguments that are only made available asynchronously. Ideally, we'd use
  // React concurrent mode and Suspense in order to handle that more gracefully.
  if (space == null) {
    return null;
  } else if (
    isLoadingLogSources ||
    isUninitialized ||
    isLoadingLogAnalysisIdFormats ||
    !idFormats
  ) {
    return <SourceLoadingPage />;
  } else if (hasFailedLoadingLogSources || hasFailedLoadingLogAnalysisIdFormats) {
    return <LogSourceErrorPage errors={logSourcesError !== undefined ? [logSourcesError] : []} />;
  } else if (logSources.length > 0) {
    return (
      <LogEntryFlyoutProvider>
        <LogEntryRateModuleProvider
          indexPattern={combinedIndices}
          spaceId={space.id}
          sourceId={DEFAULT_MODULE_SOURCE_CONFIGURATION_ID}
          idFormat={idFormats[logEntryRateJobType]}
          timestampField={TIMESTAMP_FIELD}
          runtimeMappings={{}}
        >
          <LogEntryCategoriesModuleProvider
            indexPattern={combinedIndices}
            spaceId={space.id}
            sourceId={DEFAULT_MODULE_SOURCE_CONFIGURATION_ID}
            idFormat={idFormats[logEntryCategoriesJobType]}
            timestampField={TIMESTAMP_FIELD}
            runtimeMappings={{}}
          >
            <LogAnalysisSetupFlyoutStateProvider>{children}</LogAnalysisSetupFlyoutStateProvider>
          </LogEntryCategoriesModuleProvider>
        </LogEntryRateModuleProvider>
      </LogEntryFlyoutProvider>
    );
  } else {
    return null;
  }
};
