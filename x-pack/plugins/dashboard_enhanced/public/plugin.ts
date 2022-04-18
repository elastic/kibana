/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreStart, CoreSetup, Plugin, PluginInitializerContext } from '@kbn/core/public';
import { SharePluginStart, SharePluginSetup } from '@kbn/share-plugin/public';
import { EmbeddableSetup, EmbeddableStart } from '@kbn/embeddable-plugin/public';
import { DataPublicPluginStart } from '@kbn/data-plugin/public';
import {
  AdvancedUiActionsSetup,
  AdvancedUiActionsStart,
} from '@kbn/ui-actions-enhanced-plugin/public';
import { DashboardStart } from '@kbn/dashboard-plugin/public';
import { DashboardDrilldownsService } from './services';

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
  implements Plugin<SetupContract, StartContract, SetupDependencies, StartDependencies>
{
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
