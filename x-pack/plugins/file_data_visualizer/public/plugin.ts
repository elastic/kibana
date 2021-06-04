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
import { getFileDataVisualizerComponent } from './api';
import { getMaxBytesFormatted } from './application/util/get_max_bytes';
import { registerHomeAddData, registerHomeFeatureCatalogue } from './register_home';

export interface FileDataVisualizerSetupDependencies {
  home?: HomePublicPluginSetup;
}
export interface FileDataVisualizerStartDependencies {
  data: DataPublicPluginStart;
  fileUpload: FileUploadPluginStart;
  maps: MapsStartApi;
  embeddable: EmbeddableStart;
  security?: SecurityPluginSetup;
  share: SharePluginStart;
}

export type FileDataVisualizerPluginSetup = ReturnType<FileDataVisualizerPlugin['setup']>;
export type FileDataVisualizerPluginStart = ReturnType<FileDataVisualizerPlugin['start']>;

export class FileDataVisualizerPlugin
  implements
    Plugin<
      FileDataVisualizerPluginSetup,
      FileDataVisualizerPluginStart,
      FileDataVisualizerSetupDependencies,
      FileDataVisualizerStartDependencies
    > {
  public setup(core: CoreSetup, plugins: FileDataVisualizerSetupDependencies) {
    if (plugins.home) {
      registerHomeAddData(plugins.home);
      registerHomeFeatureCatalogue(plugins.home);
    }
  }

  public start(core: CoreStart, plugins: FileDataVisualizerStartDependencies) {
    setStartServices(core, plugins);
    return { getFileDataVisualizerComponent, getMaxBytesFormatted };
  }
}
