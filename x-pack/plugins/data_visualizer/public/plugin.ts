/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart, PluginInitializerContext } from '@kbn/core/public';
import type { Plugin } from '@kbn/core/public';

import { registerReactEmbeddableFactory } from '@kbn/embeddable-plugin/public';
import { getComponents } from './api';
import { getMaxBytesFormatted } from './application/common/util/get_max_bytes';
import { registerHomeAddData, registerHomeFeatureCatalogue } from './register_home';
import { setStartServices } from './kibana_services';
import { IndexDataVisualizerLocatorDefinition } from './application/index_data_visualizer/locator';
import type { ConfigSchema } from '../common/app';
import { FIELD_STATS_ID } from './application/index_data_visualizer/embeddables/grid_embeddable/constants';
import { createFieldStatsGridAction } from './application/index_data_visualizer/embeddables/grid_embeddable/ui_actions/create_field_stats_embeddable_ui_action';
import type {
  DataVisualizerCoreSetup,
  DataVisualizerPluginSetup,
  DataVisualizerPluginStart,
  DataVisualizerSetupDependencies,
  DataVisualizerStartDependencies,
} from './application/common/types/data_visualizer_plugin';
export class DataVisualizerPlugin
  implements
    Plugin<
      DataVisualizerPluginSetup,
      DataVisualizerPluginStart,
      DataVisualizerSetupDependencies,
      DataVisualizerStartDependencies
    >
{
  private resultsLinks = {
    fileBeat: {
      enabled: true,
    },
  };

  constructor(initializerContext: PluginInitializerContext<ConfigSchema>) {
    const resultsLinks = initializerContext.config.get().resultLinks;
    if (resultsLinks !== undefined) {
      this.resultsLinks.fileBeat.enabled = resultsLinks.fileBeat?.enabled ?? true;
    }
  }

  public setup(core: DataVisualizerCoreSetup, plugins: DataVisualizerSetupDependencies) {
    if (plugins.home) {
      registerHomeAddData(plugins.home, this.resultsLinks);
      registerHomeFeatureCatalogue(plugins.home);
    }

    if (plugins.uiActions) {
      const createFieldStatsAction = createFieldStatsGridAction(core.getStartServices);
      plugins.uiActions.registerAction(createFieldStatsAction);
    }

    // registerEmbeddables(plugins.embeddable, core);
    plugins.share.url.locators.create(new IndexDataVisualizerLocatorDefinition());
  }

  public start(core: CoreStart, plugins: DataVisualizerStartDependencies) {
    setStartServices(core, plugins);
    const {
      getFileDataVisualizerComponent,
      getIndexDataVisualizerComponent,
      getDataDriftComponent,
    } = getComponents(this.resultsLinks);
    // registerCreateFieldListAction(deps.uiActions);
    // registerReactEmbeddableFactory(FIELD_LIST_ID, async () => {
    //   const { getFieldListFactory } = await import(
    //     './react_embeddables/field_list/field_list_react_embeddable'
    //   );
    //   return getFieldListFactory(core, deps);
    // });

    registerReactEmbeddableFactory(FIELD_STATS_ID, async () => {
      const { getFieldStatsTableFactory } = await import(
        './application/index_data_visualizer/embeddables/grid_embeddable/field_stats_react_embeddable'
      );
      return getFieldStatsTableFactory(core, plugins);
    });

    return {
      getFileDataVisualizerComponent,
      getIndexDataVisualizerComponent,
      getDataDriftComponent,
      getMaxBytesFormatted,
    };
  }
}
