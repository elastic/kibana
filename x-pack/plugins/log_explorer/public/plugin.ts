/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { LOG_EXPLORER_PROFILE_ID } from '../common/constants';
import { DiscoverLogExplorerConfig } from '../common/plugin_config';
import { createLogExplorerProfileCustomizations } from './customizations/log_explorer_profile';
import { getLogExplorerDeepLink } from './deep_links';
import {
  DiscoverLogExplorerPluginSetup,
  DiscoverLogExplorerPluginStart,
  DiscoverLogExplorerSetupDeps,
  DiscoverLogExplorerStartDeps,
} from './types';

export class DiscoverLogExplorerPlugin
  implements Plugin<DiscoverLogExplorerPluginSetup, DiscoverLogExplorerPluginStart>
{
  private config: DiscoverLogExplorerConfig;

  constructor(context: PluginInitializerContext<DiscoverLogExplorerConfig>) {
    this.config = context.config.get();
  }

  public setup(core: CoreSetup, plugins: DiscoverLogExplorerSetupDeps) {
    core.application.register({
      id: 'log-explorer',
      title: i18n.translate('xpack.log_explorer.appTitle', { defaultMessage: 'Log Explorer' }),
      mount(params) {
        throw new Error('Function not implemented.');
      },
    });
  }

  public start(core: CoreStart, plugins: DiscoverLogExplorerStartDeps) {
    const { discover, data } = plugins;

    discover.registerCustomizationProfile(LOG_EXPLORER_PROFILE_ID, {
      customize: createLogExplorerProfileCustomizations({ core, data }),
      deepLinks: [getLogExplorerDeepLink({ isVisible: this.config.featureFlags.deepLinkVisible })],
    });
  }
}
