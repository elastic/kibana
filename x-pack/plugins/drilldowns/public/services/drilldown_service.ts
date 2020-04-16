/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CoreSetup } from 'src/core/public';
import {
  AdvancedUiActionsSetup,
  AdvancedUiActionsActionFactoryDefinition as ActionFactoryDefinition,
} from '../../../advanced_ui_actions/public';
import { DrilldownDefinition, DrilldownFactoryContext } from '../types';

export interface DrilldownServiceSetupDeps {
  advancedUiActions: AdvancedUiActionsSetup;
}

export interface DrilldownServiceSetupContract {
  /**
   * Convenience method to register a drilldown.
   */
  registerDrilldown: <
    Config extends object = object,
    CreationContext extends object = object,
    ExecutionContext extends object = object
  >(
    drilldown: DrilldownDefinition<Config, CreationContext, ExecutionContext>
  ) => void;
}

export class DrilldownService {
  setup(
    core: CoreSetup,
    { advancedUiActions }: DrilldownServiceSetupDeps
  ): DrilldownServiceSetupContract {
    const registerDrilldown = <
      Config extends object = object,
      CreationContext extends object = object,
      ExecutionContext extends object = object
    >({
      id: factoryId,
      order,
      CollectConfig,
      createConfig,
      isConfigValid,
      getDisplayName,
      euiIcon,
      execute,
      getHref,
    }: DrilldownDefinition<Config, CreationContext, ExecutionContext>) => {
      const actionFactory: ActionFactoryDefinition<
        Config,
        DrilldownFactoryContext<CreationContext>,
        ExecutionContext
      > = {
        id: factoryId,
        order,
        CollectConfig,
        createConfig,
        isConfigValid,
        getDisplayName,
        getIconType: () => euiIcon,
        isCompatible: async () => true,
        create: serializedAction => ({
          id: '',
          type: factoryId,
          getIconType: () => euiIcon,
          getDisplayName: () => serializedAction.name,
          execute: async context => await execute(serializedAction.config, context),
          getHref: getHref ? context => getHref(serializedAction.config, context) : undefined,
        }),
      } as ActionFactoryDefinition<
        Config,
        DrilldownFactoryContext<CreationContext>,
        ExecutionContext
      >;

      advancedUiActions.registerActionFactory(actionFactory);
    };

    return {
      registerDrilldown,
    };
  }
}
