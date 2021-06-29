/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup, CoreStart } from 'kibana/public';
import { DevToolsSetup } from 'src/plugins/dev_tools/public';
import { LicensingPluginSetup } from '../../licensing/public';
import { FileUploadPluginStart } from '../../file_upload/public';
import { Plugin } from '../../../../src/core/public';

import { HomePublicPluginSetup } from '../../../../src/plugins/home/public';
import { registerDevTool, registerHomeFeatureCatalogue } from './registration';
import { setStartServices } from './kibana_services';

export interface EcsMapperSetupDependencies {
  home?: HomePublicPluginSetup;
  devTools: DevToolsSetup;
  licensing: LicensingPluginSetup;
}
export interface EcsMapperStartDependencies {
  fileUpload: FileUploadPluginStart;
}

export type EcsMapperPluginSetup = ReturnType<EcsMapperPlugin['setup']>;
export type EcsMapperPluginStart = ReturnType<EcsMapperPlugin['start']>;

export class EcsMapperPlugin
  implements
    Plugin<
      EcsMapperPluginSetup,
      EcsMapperPluginStart,
      EcsMapperSetupDependencies,
      EcsMapperStartDependencies
    > {
  public setup(core: CoreSetup, plugins: EcsMapperSetupDependencies) {
    if (plugins.home) {
      registerHomeFeatureCatalogue(plugins.home);
    }
    registerDevTool(plugins, core);
  }

  public start(core: CoreStart, plugins: EcsMapperStartDependencies) {
    setStartServices(core, plugins);
  }
}
