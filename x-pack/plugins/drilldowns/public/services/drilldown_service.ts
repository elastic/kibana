/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CoreSetup } from 'src/core/public';
import { AdvancedUiActionsSetup } from '../../../advanced_ui_actions/public';
import { Drilldown, DrilldownFactoryContext } from '../types';
import { UiActionsActionFactoryDefinition as ActionFactoryDefinition } from '../../../../../src/plugins/ui_actions/public';

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
    drilldown: Drilldown<Config, CreationContext, ExecutionContext>
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
      places,
      CollectConfig,
      createConfig,
      isConfigValid,
      getDisplayName,
      euiIcon,
      execute,
    }: Drilldown<Config, CreationContext, ExecutionContext>) => {
      const actionFactory: ActionFactoryDefinition<
        Config,
        DrilldownFactoryContext<CreationContext>,
        ExecutionContext
      > = {
        id: factoryId,
        CollectConfig,
        createConfig,
        isConfigValid,
        getDisplayName,
        getIconType: () => euiIcon,
        isCompatible: async ({ place }: any) => (!places ? true : places.indexOf(place) > -1),
        create: serializedAction => ({
          id: '',
          type: factoryId,
          getIconType: () => euiIcon,
          execute: async context => await execute(serializedAction.config, context),
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
