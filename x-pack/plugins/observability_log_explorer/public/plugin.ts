/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { type ObservabilityLogExplorerConfig } from '../common/plugin_config';
import type {
  ObservabilityLogExplorerPluginSetup,
  ObservabilityLogExplorerPluginStart,
  ObservabilityLogExplorerSetupDeps,
  ObservabilityLogExplorerStartDeps,
} from './types';

export class ObservabilityLogExplorerPlugin
  implements Plugin<ObservabilityLogExplorerPluginSetup, ObservabilityLogExplorerPluginStart>
{
  private config: ObservabilityLogExplorerConfig;

  constructor(context: PluginInitializerContext<ObservabilityLogExplorerConfig>) {
    this.config = context.config.get();
  }

  public setup(core: CoreSetup, plugins: ObservabilityLogExplorerSetupDeps) {
    core.application.register({
      id: 'log-explorer',
      title: i18n.translate('xpack.observability_log_explorer.appTitle', {
        defaultMessage: 'Log Explorer',
      }),
      mount(params) {
        throw new Error('Function not implemented.');
      },
    });
  }

  public start(core: CoreStart, plugins: ObservabilityLogExplorerStartDeps) {}
}
