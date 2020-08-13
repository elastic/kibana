/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// @ts-ignore
import { React } from 'react';
import { CoreSetup, CoreStart, Plugin } from 'kibana/server';
// @ts-ignore
import { JsonUploadAndParse } from './components/json_upload_and_parse';
// @ts-ignore
import { setupInitServicesAndConstants, startInitServicesAndConstants } from './kibana_services';
import { IDataPluginServices } from '../../../../src/plugins/data/public';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface FileUploadPluginSetupDependencies {}
export interface FileUploadPluginStartDependencies {
  data: IDataPluginServices;
}

export type FileUploadPluginSetup = ReturnType<FileUploadPlugin['setup']>;
export interface FileUploadPluginStart {
  JsonUploadAndParse: React.ComponentType<unknown>;
}

export class FileUploadPlugin implements Plugin<FileUploadPluginSetup, FileUploadPluginStart> {
  public setup(core: CoreSetup, plugins: FileUploadPluginSetupDependencies) {
    setupInitServicesAndConstants(core);
  }

  public start(core: CoreStart, plugins: FileUploadPluginStartDependencies) {
    startInitServicesAndConstants(core, plugins);
    return {
      JsonUploadAndParse,
    };
  }
}
