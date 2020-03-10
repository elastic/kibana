/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CoreSetup } from 'src/core/public';
import { AdvancedUiActionsSetup } from '../../../advanced_ui_actions/public';

// TODO: MOCK DATA
import {
  dashboardDrilldownActionFactory,
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
  registerDrilldown: (drilldownFactory: ActionFactory<any>) => void;
}

export class DrilldownService {
  setup(
    core: CoreSetup,
    { advancedUiActions }: DrilldownServiceSetupDeps
  ): DrilldownServiceSetupContract {
    const registerDrilldown: DrilldownServiceSetupContract['registerDrilldown'] = drilldownFactory => {
      advancedUiActions.actionFactory.register(drilldownFactory);
    };

    registerDrilldown(dashboardDrilldownActionFactory);
    registerDrilldown(urlDrilldownActionFactory);

    return {
      registerDrilldown,
    };
  }
}
