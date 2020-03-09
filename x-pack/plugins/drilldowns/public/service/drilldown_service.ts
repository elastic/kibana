/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CoreSetup } from 'src/core/public';
import { DrilldownsSetupDependencies } from '../plugin';
// TODO: MOCK DATA
import {
  dashboardDrilldownActionFactory,
  urlDrilldownActionFactory,
  // eslint-disable-next-line @kbn/eslint/no-restricted-paths
} from '../../../advanced_ui_actions/public/components/action_wizard/test_data';

export class DrilldownService {
  bootstrap(core: CoreSetup, { uiActions, advancedUiActions }: DrilldownsSetupDependencies) {
    // TODO: mocks
    advancedUiActions.actionFactory.register(dashboardDrilldownActionFactory);
    advancedUiActions.actionFactory.register(urlDrilldownActionFactory);
  }

  /**
   * Convenience method to register a drilldown. (It should set-up all the
   * necessary triggers and actions.)
   */
  registerDrilldown = (): void => {
    throw new Error('not implemented');
  };
}
