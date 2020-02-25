/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// @ts-ignore
import { CoreSetup, CoreStart } from 'kibana/server';
import { JsonUploadAndParse } from './components/json_upload_and_parse';
// @ts-ignore
import { setupInitServicesAndConstants, startInitServicesAndConstants } from './kibana_services';

/**
 * These are the interfaces with your public contracts. You should export these
 * for other plugins to use in _their_ `SetupDeps`/`StartDeps` interfaces.
 * @public
 */
export type FileUploadPluginSetup = ReturnType<FileUploadPlugin['setup']>;
export type FileUploadPluginStart = ReturnType<FileUploadPlugin['start']>;

/** @internal */
export class FileUploadPlugin implements Plugin<FileUploadPluginSetup, FileUploadPluginStart> {
  public setup(core: CoreSetup, plugins: any) {
    setupInitServicesAndConstants(core, plugins);
  }

  public start(core: CoreStart) {
    startInitServicesAndConstants(core);
    return {
      JsonUploadAndParse,
    };
  }
}
