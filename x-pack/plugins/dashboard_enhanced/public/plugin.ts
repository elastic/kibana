/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CoreStart, CoreSetup, Plugin, PluginInitializerContext } from 'src/core/public';
import { SharePluginStart, SharePluginSetup } from '../../../../src/plugins/share/public';
import { EmbeddableSetup, EmbeddableStart } from '../../../../src/plugins/embeddable/public';
import { DashboardDrilldownsService } from './services';
import { DataPublicPluginStart } from '../../../../src/plugins/data/public';
import { AdvancedUiActionsSetup, AdvancedUiActionsStart } from '../../ui_actions_enhanced/public';
import { DashboardStart } from '../../../../src/plugins/dashboard/public';

export interface SetupDependencies {
  uiActionsEnhanced: AdvancedUiActionsSetup;
  embeddable: EmbeddableSetup;
  share: SharePluginSetup;
}

export interface StartDependencies {
  uiActionsEnhanced: AdvancedUiActionsStart;
  data: DataPublicPluginStart;
  embeddable: EmbeddableStart;
  share: SharePluginStart;
  dashboard: DashboardStart;
}

// eslint-disable-next-line
export interface SetupContract {}

// eslint-disable-next-line
export interface StartContract {}

export class DashboardEnhancedPlugin
  implements Plugin<SetupContract, StartContract, SetupDependencies, StartDependencies> {
  public readonly drilldowns = new DashboardDrilldownsService();

  constructor(protected readonly context: PluginInitializerContext) {}

  public setup(core: CoreSetup<StartDependencies>, plugins: SetupDependencies): SetupContract {
    this.drilldowns.bootstrap(core, plugins, {
      enableDrilldowns: true,
    });

    return {};
  }

  public start(core: CoreStart, plugins: StartDependencies): StartContract {
    return {};
  }

  public stop() {}
}
