/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { CoreSetup, CoreStart, Plugin } from 'kibana/server';
import { FileUploadComponentProps, getFileUploadComponent } from './get_file_upload_component';
// @ts-ignore
import { setupInitServicesAndConstants, startInitServicesAndConstants } from './kibana_services';
import { IDataPluginServices } from '../../../../src/plugins/data/public';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface SetupDependencies {}
export interface StartDependencies {
  data: IDataPluginServices;
}

export type SetupContract = ReturnType<FileUploadPlugin['setup']>;
export interface StartContract {
  getFileUploadComponent: () => Promise<React.ComponentType<FileUploadComponentProps>>;
}

export class FileUploadPlugin
  implements Plugin<SetupContract, StartContract, SetupDependencies, StartDependencies> {
  public setup(core: CoreSetup, plugins: SetupDependencies) {
    setupInitServicesAndConstants(core);
  }

  public start(core: CoreStart, plugins: StartDependencies) {
    startInitServicesAndConstants(core, plugins);
    return {
      getFileUploadComponent,
    };
  }
}
