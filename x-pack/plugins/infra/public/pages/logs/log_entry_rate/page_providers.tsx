/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { LogAnalysisSetupFlyoutStateProvider } from '../../../components/logging/log_analysis_setup/setup_flyout';
import { LogEntryCategoriesModuleProvider } from '../../../containers/logs/log_analysis/modules/log_entry_categories';
import { LogEntryRateModuleProvider } from '../../../containers/logs/log_analysis/modules/log_entry_rate';
import { useLogSourceContext } from '../../../containers/logs/log_source';
import { useActiveKibanaSpace } from '../../../hooks/use_kibana_space';
import { LogFlyout } from '../../../containers/logs/log_flyout';

export const LogEntryRatePageProviders: React.FunctionComponent = ({ children }) => {
  const { sourceId, sourceConfiguration } = useLogSourceContext();
  const { space } = useActiveKibanaSpace();

  // This is a rather crude way of guarding the dependent providers against
  // arguments that are only made available asynchronously. Ideally, we'd use
  // React concurrent mode and Suspense in order to handle that more gracefully.
  if (sourceConfiguration?.configuration.logAlias == null || space == null) {
    return null;
  }

  return (
    <LogFlyout.Provider>
      <LogEntryRateModuleProvider
        indexPattern={sourceConfiguration?.configuration.logAlias ?? ''}
        sourceId={sourceId}
        spaceId={space.id}
        timestampField={sourceConfiguration?.configuration.fields.timestamp ?? ''}
      >
        <LogEntryCategoriesModuleProvider
          indexPattern={sourceConfiguration?.configuration.logAlias ?? ''}
          sourceId={sourceId}
          spaceId={space.id}
          timestampField={sourceConfiguration?.configuration.fields.timestamp ?? ''}
        >
          <LogAnalysisSetupFlyoutStateProvider>{children}</LogAnalysisSetupFlyoutStateProvider>
        </LogEntryCategoriesModuleProvider>
      </LogEntryRateModuleProvider>
    </LogFlyout.Provider>
  );
};
