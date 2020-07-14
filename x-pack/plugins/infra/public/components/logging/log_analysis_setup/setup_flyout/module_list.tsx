/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React, { useCallback } from 'react';
import {
  logEntryCategoriesModule,
  useLogEntryCategoriesModuleContext,
} from '../../../../containers/logs/log_analysis/modules/log_entry_categories';
import {
  logEntryRateModule,
  useLogEntryRateModuleContext,
} from '../../../../containers/logs/log_analysis/modules/log_entry_rate';
import { LogAnalysisModuleListCard } from './module_list_card';
import type { ModuleId } from './setup_flyout_state';

export const LogAnalysisModuleList: React.FC<{
  onViewModuleSetup: (module: ModuleId) => void;
}> = ({ onViewModuleSetup }) => {
  const { setupStatus: logEntryRateSetupStatus } = useLogEntryRateModuleContext();
  const { setupStatus: logEntryCategoriesSetupStatus } = useLogEntryCategoriesModuleContext();

  const viewLogEntryRateSetupFlyout = useCallback(() => {
    onViewModuleSetup('logs_ui_analysis');
  }, [onViewModuleSetup]);
  const viewLogEntryCategoriesSetupFlyout = useCallback(() => {
    onViewModuleSetup('logs_ui_categories');
  }, [onViewModuleSetup]);

  return (
    <>
      <EuiFlexGroup>
        <EuiFlexItem>
          <LogAnalysisModuleListCard
            moduleDescription={logEntryRateModule.moduleDescription}
            moduleName={logEntryRateModule.moduleName}
            moduleStatus={logEntryRateSetupStatus}
            onViewSetup={viewLogEntryRateSetupFlyout}
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <LogAnalysisModuleListCard
            moduleDescription={logEntryCategoriesModule.moduleDescription}
            moduleName={logEntryCategoriesModule.moduleName}
            moduleStatus={logEntryCategoriesSetupStatus}
            onViewSetup={viewLogEntryCategoriesSetupFlyout}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};
