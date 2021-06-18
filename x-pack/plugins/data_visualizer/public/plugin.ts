/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup, CoreStart } from 'kibana/public';
import type { EmbeddableStart } from '../../../../src/plugins/embeddable/public';
import type { SharePluginStart } from '../../../../src/plugins/share/public';
import { Plugin } from '../../../../src/core/public';

import { setStartServices } from './kibana_services';
import type { DataPublicPluginStart } from '../../../../src/plugins/data/public';
import type { HomePublicPluginSetup } from '../../../../src/plugins/home/public';
import type { FileUploadPluginStart } from '../../file_upload/public';
import type { MapsStartApi } from '../../maps/public';
import type { SecurityPluginSetup } from '../../security/public';
import type { LensPublicStart } from '../../lens/public';
import { getFileDataVisualizerComponent, getIndexDataVisualizerComponent } from './api';
import { getMaxBytesFormatted } from './application/common/util/get_max_bytes';
import { registerHomeAddData, registerHomeFeatureCatalogue } from './register_home';

export interface DataVisualizerSetupDependencies {
  home?: HomePublicPluginSetup;
}
export interface DataVisualizerStartDependencies {
  data: DataPublicPluginStart;
  fileUpload: FileUploadPluginStart;
  maps: MapsStartApi;
  embeddable: EmbeddableStart;
  security?: SecurityPluginSetup;
  share: SharePluginStart;
  lens?: LensPublicStart;
}

export type DataVisualizerPluginSetup = ReturnType<DataVisualizerPlugin['setup']>;
export type DataVisualizerPluginStart = ReturnType<DataVisualizerPlugin['start']>;

export class DataVisualizerPlugin
  implements
    Plugin<
      DataVisualizerPluginSetup,
      DataVisualizerPluginStart,
      DataVisualizerSetupDependencies,
      DataVisualizerStartDependencies
    > {
  public setup(core: CoreSetup, plugins: DataVisualizerSetupDependencies) {
    if (plugins.home) {
      registerHomeAddData(plugins.home);
      registerHomeFeatureCatalogue(plugins.home);
    }
  }

  public start(core: CoreStart, plugins: DataVisualizerStartDependencies) {
    setStartServices(core, plugins);
    return {
      getFileDataVisualizerComponent,
      getIndexDataVisualizerComponent,
      getMaxBytesFormatted,
    };
  }
}
