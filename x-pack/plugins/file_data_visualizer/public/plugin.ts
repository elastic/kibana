/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreStart } from 'kibana/public';
import { Plugin } from '../../../../src/core/public';
// import {
//   FileDataVisualizerStartApi,
//   getFileDataVisualizerComponent,
//   importerFactory,
//   hasImportPermission,
//   analyzeFile,
// } from './api';
import { setStartServices } from './kibana_services';
import { DataPublicPluginStart } from '../../../../src/plugins/data/public';
import type { FileUploadPluginStart } from '../../file_upload/public';
// import { getMaxBytes, getMaxBytesFormatted } from './get_max_bytes';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface FileDataVisualizerSetupDependencies {}
// export interface FileDataVisualizerStartDependencies {}
export interface FileDataVisualizerStartDependencies {
  data: DataPublicPluginStart;
  fileUpload: FileUploadPluginStart;
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
  public setup() {}
  // public start() {}

  public start(core: CoreStart, plugins: FileDataVisualizerStartDependencies) {
    setStartServices(core, plugins);
    return {};
  }
}
