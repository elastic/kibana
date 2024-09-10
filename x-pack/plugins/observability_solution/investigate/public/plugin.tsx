/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/public';
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

export class InvestigatePlugin
  implements
    Plugin<
      InvestigatePublicSetup,
      InvestigatePublicStart,
      InvestigateSetupDependencies,
      InvestigateStartDependencies
    >
{
  private itemDefinitionRegistry: ItemDefinitionRegistry = new ItemDefinitionRegistry();

  constructor(context: PluginInitializerContext<ConfigSchema>) {}

  setup(coreSetup: CoreSetup, pluginsSetup: InvestigateSetupDependencies): InvestigatePublicSetup {
    return {
      registerItemDefinition: <
        Params extends ItemDefinitionParams,
        Data extends ItemDefinitionData
      >(
        definition: ItemDefinition<Params, Data>
      ) => {
        this.itemDefinitionRegistry.registerItem(definition);
      },
    };
  }

  start(coreStart: CoreStart, pluginsStart: InvestigateStartDependencies): InvestigatePublicStart {
    return {
      getItemDefinitions: () => this.itemDefinitionRegistry.getItemDefinitions(),
      getItemDefinitionByType: (type: string) =>
        this.itemDefinitionRegistry.getItemDefinitionByType(type),
    };
  }
}
