/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart, PluginInitializerContext } from '@kbn/core/public';
import type { Plugin } from '@kbn/core/public';

import type { CoreSetup } from '@kbn/core/public';
import { dynamic } from '@kbn/shared-ux-utility';
import { getComponents } from './api';
import { getMaxBytesFormatted } from './application/common/util/get_max_bytes';
import { registerHomeAddData, registerHomeFeatureCatalogue } from './register_home';
import { setStartServices } from './kibana_services';
import { IndexDataVisualizerLocatorDefinition } from './application/index_data_visualizer/locator';
import type { ConfigSchema } from '../common/app';
import type {
  DataVisualizerSetupDependencies,
  DataVisualizerStartDependencies,
} from './application/common/types/data_visualizer_plugin';
export type DataVisualizerPluginSetup = ReturnType<DataVisualizerPlugin['setup']>;
export type DataVisualizerPluginStart = ReturnType<DataVisualizerPlugin['start']>;

export type DataVisualizerCoreSetup = CoreSetup<
  DataVisualizerStartDependencies,
  DataVisualizerPluginStart
>;

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

    plugins.share.url.locators.create(new IndexDataVisualizerLocatorDefinition());
  }

  public start(core: CoreStart, plugins: DataVisualizerStartDependencies) {
    setStartServices(core, plugins);
    const {
      getFileDataVisualizerComponent,
      getIndexDataVisualizerComponent,
      getDataDriftComponent,
    } = getComponents(this.resultsLinks);

    return {
      getFileDataVisualizerComponent,
      getIndexDataVisualizerComponent,
      getDataDriftComponent,
      getMaxBytesFormatted,
      FieldStatisticsTable: dynamic(
        async () =>
          import(
            './application/index_data_visualizer/embeddables/grid_embeddable/field_stats_embeddable_wrapper'
          )
      ),
    };
  }
}
