/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type {
  AuthenticatedUser,
  CoreSetup,
  CoreStart,
  Plugin,
  PluginInitializerContext,
} from '@kbn/core/public';
import { GetInvestigationResponse } from '@kbn/investigation-shared';
import type { Logger } from '@kbn/logging';
import { useMemo } from 'react';
import { createUseInvestigation } from './hooks/use_investigation';
import {
  ItemDefinition,
  ItemDefinitionData,
  ItemDefinitionParams,
  ItemDefinitionRegistry,
} from './investigation/item_definition_registry';
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
  private logger: Logger;
  private widgetRegistry: WidgetRegistry = new WidgetRegistry();
  private itemDefinitionRegistry: ItemDefinitionRegistry = new ItemDefinitionRegistry();

  constructor(context: PluginInitializerContext<ConfigSchema>) {
    this.logger = context.logger.get();
  }

  setup(coreSetup: CoreSetup, pluginsSetup: InvestigateSetupDependencies): InvestigatePublicSetup {
    return {
      // new
      registerItemDefinition: <
        Params extends ItemDefinitionParams,
        Data extends ItemDefinitionData
      >(
        definition: ItemDefinition<Params, Data>
      ) => {
        this.itemDefinitionRegistry.registerItem(definition);
      },
      // old
      register: (callback) => {
        Promise.race([
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
      },
    };
  }

  start(coreStart: CoreStart, pluginsStart: InvestigateStartDependencies): InvestigatePublicStart {
    return {
      // new
      getItemDefinitions: () => this.itemDefinitionRegistry.getItemDefinitions(),
      getItemDefinitionByType: (type: string) =>
        this.itemDefinitionRegistry.getItemDefinitionByType(type),
      // old
      getWidgetDefinitions: this.widgetRegistry.getWidgetDefinitions,
      useInvestigation: ({
        user,
        investigationData,
      }: {
        user: AuthenticatedUser;
        investigationData?: GetInvestigationResponse;
      }) => {
        const widgetDefinitions = useMemo(() => this.widgetRegistry.getWidgetDefinitions(), []);

        return createUseInvestigation({
          notifications: coreStart.notifications,
          widgetDefinitions,
        })({
          user,
          investigationData,
        });
      },
    };
  }
}
