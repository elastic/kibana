/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { CoreSetup, CoreStart } from '../../../../src/core/public/types';
import type { Plugin } from '../../../../src/core/public/plugins/plugin';
import type { DataPublicPluginStart } from '../../../../src/plugins/data/public/types';
import type { EmbeddableStart } from '../../../../src/plugins/embeddable/public/plugin';
import type { HomePublicPluginSetup } from '../../../../src/plugins/home/public/plugin';
import type { PluginStart as IndexPatternFieldEditorStart } from '../../../../src/plugins/index_pattern_field_editor/public/types';
import type { SharePluginStart } from '../../../../src/plugins/share/public/plugin';
import type { FileUploadPluginStart } from '../../file_upload/public/plugin';
import type { LensPublicStart } from '../../lens/public/plugin';
import type { MapsStartApi } from '../../maps/public/api/start_api';
import type { SecurityPluginSetup } from '../../security/public/plugin';
import { getFileDataVisualizerComponent, getIndexDataVisualizerComponent } from './api';
import { getMaxBytesFormatted } from './application/common/util/get_max_bytes';
import { setStartServices } from './kibana_services';
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
  indexPatternFieldEditor?: IndexPatternFieldEditorStart;
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
