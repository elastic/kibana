/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CoreSetup } from 'src/core/public';
import { AdvancedUiActionsSetup } from '../../../advanced_ui_actions/public';
import { Drilldown } from '../types';

// TODO: MOCK DATA
import {
  // dashboardDrilldownActionFactory,
  urlDrilldownActionFactory,
  // eslint-disable-next-line @kbn/eslint/no-restricted-paths
} from '../../../advanced_ui_actions/public/components/action_wizard/test_data';

export interface DrilldownServiceSetupDeps {
  advancedUiActions: AdvancedUiActionsSetup;
}

export interface DrilldownServiceSetupContract {
  /**
   * Convenience method to register a drilldown.
   */
  registerDrilldown: (drilldown: Drilldown<any, any, any>) => void;
}

export class DrilldownService {
  setup(
    core: CoreSetup,
    { advancedUiActions }: DrilldownServiceSetupDeps
  ): DrilldownServiceSetupContract {
    const registerDrilldown: DrilldownServiceSetupContract['registerDrilldown'] = ({
      id,
      places,
      CollectConfig,
      createConfig,
      isConfigValid,
      getDisplayName,
      euiIcon,
      execute,
    }) => {
      advancedUiActions.registerActionFactory({
        id,
        CollectConfig,
        createConfig,
        isConfigValid,
        getDisplayName,
        getIconType: () => euiIcon,
        isCompatible: async ({ place }: any) => (!places ? true : places.indexOf(place) > -1),
        create: config => ({
          id: '',
          type: id as any,
          getIconType: () => euiIcon,
          execute: async context => await execute(config, context),
        }),
      });
    };

    /*
    registerDrilldown({
      ...dashboardDrilldownActionFactory,
      execute: () => alert('Dashboard drilldown!'),
    } as any);
    */
    registerDrilldown({
      ...urlDrilldownActionFactory,
      euiIcon: 'link',
      execute: () => alert('URL drilldown!'),
    } as any);

    return {
      registerDrilldown,
    };
  }
}
