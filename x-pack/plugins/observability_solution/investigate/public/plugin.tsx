/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { CoreSetup, CoreStart, PluginInitializerContext, Plugin } from '@kbn/core/public';
import type { Logger } from '@kbn/logging';
import { useMemo } from 'react';
import { useInvestigateWidget } from './hooks/use_investigate_widget';
import { createUseInvestigation } from './hooks/use_investigation';
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

  registrationPromises: Array<Promise<void>> = [];

  constructor(context: PluginInitializerContext<ConfigSchema>) {
    this.logger = context.logger.get();
  }
  setup(coreSetup: CoreSetup, pluginsSetup: InvestigateSetupDependencies): InvestigatePublicSetup {
    return {
      register: (callback) => {
        const registrationPromise = Promise.race([
          callback(this.widgetRegistry.registerWidget),
          new Promise<void>((resolve, reject) => {
            setTimeout(() => {
              reject(new Error('Timed out running registration function'));
            }, 30000);
          }),
        ]).catch((error) => {
          this.logger.error(
            new Error('Encountered an error during widget registration', { cause: error })
          );
          return Promise.resolve();
        });

        this.registrationPromises.push(registrationPromise);
      },
    };
  }

  start(coreStart: CoreStart, pluginsStart: InvestigateStartDependencies): InvestigatePublicStart {
    return {
      getWidgetDefinitions: this.widgetRegistry.getWidgetDefinitions,
      useInvestigation: ({ user, from, to }) => {
        const widgetDefinitions = useMemo(() => this.widgetRegistry.getWidgetDefinitions(), []);

        return createUseInvestigation({
          notifications: coreStart.notifications,
          widgetDefinitions,
        })({
          user,
          from,
          to,
        });
      },
      useInvestigateWidget,
    };
  }
}
