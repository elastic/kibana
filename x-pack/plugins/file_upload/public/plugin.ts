/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { CoreStart } from '../../../../src/core/public/types';
import type { Plugin } from '../../../../src/core/public/plugins/plugin';
import type { DataPublicPluginStart } from '../../../../src/plugins/data/public/types';
import type { FileUploadStartApi } from './api';
import {
  analyzeFile,
  checkIndexExists,
  FileUploadComponent,
  getTimeFieldRange,
  hasImportPermission,
  importerFactory,
  IndexNameFormComponent,
} from './api';
import { getMaxBytes, getMaxBytesFormatted } from './importer/get_max_bytes';
import { setStartServices } from './kibana_services';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface FileUploadSetupDependencies {}
export interface FileUploadStartDependencies {
  data: DataPublicPluginStart;
}

export type FileUploadPluginSetup = ReturnType<FileUploadPlugin['setup']>;
export type FileUploadPluginStart = ReturnType<FileUploadPlugin['start']>;

export class FileUploadPlugin
  implements
    Plugin<
      FileUploadPluginSetup,
      FileUploadPluginStart,
      FileUploadSetupDependencies,
      FileUploadStartDependencies
    > {
  public setup() {}

  public start(core: CoreStart, plugins: FileUploadStartDependencies): FileUploadStartApi {
    setStartServices(core, plugins);
    return {
      FileUploadComponent,
      IndexNameFormComponent,
      importerFactory,
      getMaxBytes,
      getMaxBytesFormatted,
      hasImportPermission,
      checkIndexExists,
      getTimeFieldRange,
      analyzeFile,
    };
  }
}
