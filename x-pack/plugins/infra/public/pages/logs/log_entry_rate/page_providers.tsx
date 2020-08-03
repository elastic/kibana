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
import { useKibanaSpaceId } from '../../../utils/use_kibana_space_id';

export const LogEntryRatePageProviders: React.FunctionComponent = ({ children }) => {
  const { sourceId, sourceConfiguration } = useLogSourceContext();
  const spaceId = useKibanaSpaceId();

  return (
    <LogEntryRateModuleProvider
      indexPattern={sourceConfiguration?.configuration.logAlias ?? ''}
      sourceId={sourceId}
      spaceId={spaceId}
      timestampField={sourceConfiguration?.configuration.fields.timestamp ?? ''}
    >
      <LogEntryCategoriesModuleProvider
        indexPattern={sourceConfiguration?.configuration.logAlias ?? ''}
        sourceId={sourceId}
        spaceId={spaceId}
        timestampField={sourceConfiguration?.configuration.fields.timestamp ?? ''}
      >
        <LogAnalysisSetupFlyoutStateProvider>{children}</LogAnalysisSetupFlyoutStateProvider>
      </LogEntryCategoriesModuleProvider>
    </LogEntryRateModuleProvider>
  );
};
