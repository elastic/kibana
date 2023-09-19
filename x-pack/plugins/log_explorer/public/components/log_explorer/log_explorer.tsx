/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { ScopedHistory } from '@kbn/core-application-browser';
import { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { DiscoverAppState, DiscoverStart } from '@kbn/discover-plugin/public';
import type { BehaviorSubject } from 'rxjs';
import {
  createLogExplorerProfileCustomizations,
  CreateLogExplorerProfileCustomizationsDeps,
} from '../../customizations/log_explorer_profile';
import { createPropertyGetProxy } from '../../utils/proxies';
import { LogExplorerProfileContext } from '../../state_machines/log_explorer_profile';

export interface CreateLogExplorerArgs extends CreateLogExplorerProfileCustomizationsDeps {
  discover: DiscoverStart;
}

export interface LogExplorerStateContainer {
  appState?: DiscoverAppState;
  logExplorerState?: Partial<LogExplorerProfileContext>;
}

export interface LogExplorerProps {
  scopedHistory: ScopedHistory;
  state$?: BehaviorSubject<LogExplorerStateContainer>;
}

export const createLogExplorer = ({
  core,
  data,
  discover: { DiscoverContainer },
}: CreateLogExplorerArgs) => {
  const overrideServices = {
    data: createDataServiceProxy(data),
  };

  return ({ scopedHistory, state$ }: LogExplorerProps) => {
    const logExplorerCustomizations = useMemo(
      () => [createLogExplorerProfileCustomizations({ core, data, state$ })],
      [state$]
    );

    return (
      <DiscoverContainer
        customizationCallbacks={logExplorerCustomizations}
        overrideServices={overrideServices}
        scopedHistory={scopedHistory}
      />
    );
  };
};

/**
 * Create proxy for the data service, in which session service enablement calls
 * are no-ops.
 */
const createDataServiceProxy = (data: DataPublicPluginStart) => {
  const noOpEnableStorage = () => {};

  const sessionServiceProxy = createPropertyGetProxy(data.search.session, {
    enableStorage: () => noOpEnableStorage,
  });

  const searchServiceProxy = createPropertyGetProxy(data.search, {
    session: () => sessionServiceProxy,
  });

  return createPropertyGetProxy(data, {
    search: () => searchServiceProxy,
  });
};
