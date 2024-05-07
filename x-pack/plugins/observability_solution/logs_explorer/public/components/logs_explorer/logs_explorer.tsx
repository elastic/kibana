/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScopedHistory } from '@kbn/core-application-browser';
import type { CoreStart } from '@kbn/core/public';
import React, { useMemo } from 'react';
import type { LogsExplorerController } from '../../controller';
import { createLogsExplorerProfileCustomizations } from '../../customizations/logs_explorer_profile';
import { LogsExplorerStartDeps } from '../../types';

export interface CreateLogsExplorerArgs {
  core: CoreStart;
  plugins: LogsExplorerStartDeps;
}

export interface LogsExplorerProps {
  scopedHistory: ScopedHistory;
  controller: LogsExplorerController;
}

export const createLogsExplorer = ({ core, plugins }: CreateLogsExplorerArgs) => {
  const {
    discover: { DiscoverContainer },
  } = plugins;

  return ({ scopedHistory, controller }: LogsExplorerProps) => {
    const logsExplorerCustomizations = useMemo(
      () => [createLogsExplorerProfileCustomizations({ controller, core, plugins })],
      [controller]
    );

    const { urlStateStorage, ...overrideServices } = controller.discoverServices;

    return (
      <DiscoverContainer
        customizationCallbacks={logsExplorerCustomizations}
        overrideServices={overrideServices}
        scopedHistory={scopedHistory}
        stateStorageContainer={urlStateStorage}
      />
    );
  };
};
