/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { LogAnalysisSetupFlyoutStateProvider } from '../../../components/logging/log_analysis_setup/setup_flyout';
import { LogEntryCategoriesModuleProvider } from '../../../containers/logs/log_analysis/modules/log_entry_categories';
import { LogEntryRateModuleProvider } from '../../../containers/logs/log_analysis/modules/log_entry_rate';
import { useLogSourceContext } from '../../../containers/logs/log_source';
import { useActiveKibanaSpace } from '../../../hooks/use_kibana_space';
import { LogFlyout } from '../../../containers/logs/log_flyout';

export const LogEntryRatePageProviders: React.FunctionComponent = ({ children }) => {
  const { sourceId, resolvedSourceConfiguration } = useLogSourceContext();
  const { space } = useActiveKibanaSpace();

  // This is a rather crude way of guarding the dependent providers against
  // arguments that are only made available asynchronously. Ideally, we'd use
  // React concurrent mode and Suspense in order to handle that more gracefully.
  if (!resolvedSourceConfiguration || space == null) {
    return null;
  }

  return (
    <LogFlyout.Provider>
      <LogEntryRateModuleProvider
        indexPattern={resolvedSourceConfiguration.indices ?? ''}
        sourceId={sourceId}
        spaceId={space.id}
        timestampField={resolvedSourceConfiguration.timestampField ?? ''}
      >
        <LogEntryCategoriesModuleProvider
          indexPattern={resolvedSourceConfiguration.indices ?? ''}
          sourceId={sourceId}
          spaceId={space.id}
          timestampField={resolvedSourceConfiguration.timestampField ?? ''}
        >
          <LogAnalysisSetupFlyoutStateProvider>{children}</LogAnalysisSetupFlyoutStateProvider>
        </LogEntryCategoriesModuleProvider>
      </LogEntryRateModuleProvider>
    </LogFlyout.Provider>
  );
};
