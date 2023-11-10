/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScopedHistory } from '@kbn/core-application-browser';
import type { CoreStart } from '@kbn/core/public';
import type { DiscoverAppState } from '@kbn/discover-plugin/public';
import React, { useMemo } from 'react';
import type { Observable } from 'rxjs';
import type { LogExplorerController } from '../../controller';
import { createLogExplorerProfileCustomizations } from '../../customizations/log_explorer_profile';
import type { LogExplorerControllerContext } from '../../state_machines/log_explorer_controller';
import type { LogExplorerStartDeps } from '../../types';

export interface CreateLogExplorerArgs {
  core: CoreStart;
  plugins: LogExplorerStartDeps;
}

export interface LogExplorerStateContainer {
  appState?: DiscoverAppState;
  logExplorerState?: Partial<LogExplorerControllerContext>;
}

export interface LogExplorerProps {
  scopedHistory: ScopedHistory;
  state$?: Observable<LogExplorerStateContainer>;
  controller: LogExplorerController;
}

export const createLogExplorer = ({ core, plugins }: CreateLogExplorerArgs) => {
  const {
    discover: { DiscoverContainer },
  } = plugins;

  return ({ scopedHistory, controller }: LogExplorerProps) => {
    const logExplorerCustomizations = useMemo(
      () => [createLogExplorerProfileCustomizations({ core, plugins, controller })],
      [controller]
    );

    const { urlStateStorage, ...overrideServices } = controller.discoverServices;

    return (
      <DiscoverContainer
        customizationCallbacks={logExplorerCustomizations}
        overrideServices={overrideServices}
        scopedHistory={scopedHistory}
        stateStorageContainer={urlStateStorage}
      />
    );
  };
};
