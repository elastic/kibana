/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CoreStart, CoreSetup, Plugin } from 'src/core/public';
import { UiActionsSetup, UiActionsStart } from '../../../../src/plugins/ui_actions/public';

export interface DashboardEnhancedSetupDependencies {
  uiActions: UiActionsSetup;
}

export interface DashboardEnhancedStartDependencies {
  uiActions: UiActionsStart;
}

// eslint-disable-next-line
export interface DashboardEnhancedSetupContract {}

// eslint-disable-next-line
export interface DashboardEnhancedStartContract {}

export class DashboardEnhancedPlugin
  implements
    Plugin<
      DashboardEnhancedSetupContract,
      DashboardEnhancedStartContract,
      DashboardEnhancedSetupDependencies,
      DashboardEnhancedStartDependencies
    > {
  public setup(
    core: CoreSetup,
    plugins: DashboardEnhancedSetupDependencies
  ): DashboardEnhancedSetupContract {
    return {};
  }

  public start(
    core: CoreStart,
    plugins: DashboardEnhancedStartDependencies
  ): DashboardEnhancedStartContract {
    return {};
  }

  public stop() {}
}
