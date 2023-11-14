/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { ScopedHistory } from '@kbn/core-application-browser';
import { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { DiscoverAppState } from '@kbn/discover-plugin/public';
import type { BehaviorSubject } from 'rxjs';
import { CoreStart } from '@kbn/core/public';
import { IUiSettingsClient } from '@kbn/core-ui-settings-browser';
import { HIDE_ANNOUNCEMENTS } from '@kbn/discover-utils';
import { createLogExplorerProfileCustomizations } from '../../customizations/log_explorer_profile';
import { createPropertyGetProxy } from '../../utils/proxies';
import { LogExplorerProfileContext } from '../../state_machines/log_explorer_profile';
import { LogExplorerStartDeps } from '../../types';
import { LogExplorerCustomizations } from './types';

export interface CreateLogExplorerArgs {
  core: CoreStart;
  plugins: LogExplorerStartDeps;
}

export interface LogExplorerStateContainer {
  appState?: DiscoverAppState;
  logExplorerState?: Partial<LogExplorerProfileContext>;
}

export interface LogExplorerProps {
  customizations?: LogExplorerCustomizations;
  scopedHistory: ScopedHistory;
  state$?: BehaviorSubject<LogExplorerStateContainer>;
}

export const createLogExplorer = ({ core, plugins }: CreateLogExplorerArgs) => {
  const {
    data,
    discover: { DiscoverContainer },
  } = plugins;

  const overrideServices = {
    data: createDataServiceProxy(data),
    uiSettings: createUiSettingsServiceProxy(core.uiSettings),
  };

  return ({ customizations = {}, scopedHistory, state$ }: LogExplorerProps) => {
    const logExplorerCustomizations = useMemo(
      () => [createLogExplorerProfileCustomizations({ core, customizations, plugins, state$ })],
      [customizations, state$]
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
/**
 * Create proxy for the uiSettings service, in which settings preferences are overwritten
 * with custom values
 */
const createUiSettingsServiceProxy = (uiSettings: IUiSettingsClient) => {
  const overrides: Record<string, any> = {
    [HIDE_ANNOUNCEMENTS]: true,
  };

  return createPropertyGetProxy(uiSettings, {
    get:
      () =>
      (key, ...args) => {
        if (key in overrides) {
          return overrides[key];
        }

        return uiSettings.get(key, ...args);
      },
  });
};
