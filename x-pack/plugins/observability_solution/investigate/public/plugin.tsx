/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { CoreSetup, CoreStart, PluginInitializerContext, Plugin } from '@kbn/core/public';
import type { Logger } from '@kbn/logging';
import type {
  ConfigSchema,
  InvestigatePublicSetup,
  InvestigatePublicStart,
  InvestigateSetupDependencies,
  InvestigateStartDependencies,
} from './types';
import { WidgetRegistry } from './widget_registry';

export class InvestigatePlugin
  implements
    Plugin<
      InvestigatePublicSetup,
      InvestigatePublicStart,
      InvestigateSetupDependencies,
      InvestigateStartDependencies
    >
{
  logger: Logger;

  widgetRegistry: WidgetRegistry = new WidgetRegistry();

  constructor(context: PluginInitializerContext<ConfigSchema>) {
    this.logger = context.logger.get();
  }
  setup(coreSetup: CoreSetup, pluginsSetup: InvestigateSetupDependencies): InvestigatePublicSetup {
    return {
      registerWidget: this.widgetRegistry.registerWidget,
    };
  }

  start(coreStart: CoreStart, pluginsStart: InvestigateStartDependencies): InvestigatePublicStart {
    return {
      getWidgetDefinitions: this.widgetRegistry.getWidgetDefinitions,
    };
  }
}
