/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import { LOG_EXPLORER_PROFILE_ID } from '../common/constants';
import { createAppUpdater } from './app_updater';
import { createLogExplorerProfileCustomizations } from './customizations/log_explorer_profile';
import {
  DiscoverLogExplorerPluginSetup,
  DiscoverLogExplorerPluginStart,
  DiscoverLogExplorerStartDeps,
} from './types';

export class DiscoverLogExplorerPlugin
  implements Plugin<DiscoverLogExplorerPluginSetup, DiscoverLogExplorerPluginStart>
{
  private appUpdater = createAppUpdater();

  public setup(core: CoreSetup) {
    core.application.registerAppUpdater(this.appUpdater);
  }

  public start(core: CoreStart, plugins: DiscoverLogExplorerStartDeps) {
    const { discover } = plugins;

    discover.customize(LOG_EXPLORER_PROFILE_ID, createLogExplorerProfileCustomizations({ core }));
  }
}
