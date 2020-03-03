/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CoreSetup } from 'src/core/public';
import { FlyoutCreateDrilldownAction, FlyoutEditDrilldownAction } from '../actions';
import { DrilldownsSetupDependencies } from '../plugin';

export class DrilldownService {
  bootstrap(core: CoreSetup, { uiActions }: DrilldownsSetupDependencies) {
    const overlays = async () => (await core.getStartServices())[0].overlays;

    const actionOpenFlyoutCreateDrilldown = new FlyoutCreateDrilldownAction({ overlays });
    uiActions.registerAction(actionOpenFlyoutCreateDrilldown);
    uiActions.attachAction('CONTEXT_MENU_TRIGGER', actionOpenFlyoutCreateDrilldown.id);

    const actionOpenFlyoutEditDrilldown = new FlyoutEditDrilldownAction({ overlays });
    uiActions.registerAction(actionOpenFlyoutEditDrilldown);
    uiActions.attachAction('CONTEXT_MENU_TRIGGER', actionOpenFlyoutEditDrilldown.id);
  }

  /**
   * Convenience method to register a drilldown. (It should set-up all the
   * necessary triggers and actions.)
   */
  registerDrilldown = (): void => {
    throw new Error('not implemented');
  };
}
