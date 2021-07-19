/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DevToolsSetup } from 'src/plugins/dev_tools/public';
import { LicensingPluginSetup } from '../../licensing/public';
import { FileUploadPluginStart } from '../../file_upload/public';
import { Plugin, CoreSetup, CoreStart } from '../../../../src/core/public';

import { HomePublicPluginSetup } from '../../../../src/plugins/home/public';
import { registerDevTool, registerHomeFeatureCatalogue } from './registration';
import { setStartServices } from './kibana_services';
import { Mapper } from '../server/services';
import { FieldRenameAction } from '../server/types';

/**
 * Publicly exposed APIs from the Mapper Service
 */
 export interface MapperServicePublicApis {
  /** description todo */
  mapToIngestPipeline: (file: string, renanmeAction?: FieldRenameAction) => object;
}

export interface EcsMapperSetupDependencies {
  home?: HomePublicPluginSetup;
  devTools: DevToolsSetup;
  licensing: LicensingPluginSetup;
  mapper: MapperServicePublicApis;
}
export interface EcsMapperStartDependencies {
  fileUpload: FileUploadPluginStart;
  mapper: MapperServicePublicApis;
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

  private mapper?: Mapper;

  public setup(core: CoreSetup, plugins: EcsMapperSetupDependencies) {
    const http = core.http;
    this.mapper = new Mapper({http});

    if (plugins.home) {
      registerHomeFeatureCatalogue(plugins.home);
    }
    registerDevTool(plugins, core);

    return {
      mapper: this.getMapperServicePublicApis()
    };
  }

  public start(core: CoreStart, plugins: EcsMapperStartDependencies) {
    if (!this.mapper) {
      throw Error('ECS Mapper plugin failed to initialize properly.');
    }

    plugins.mapper = this.mapper;
    setStartServices(core, plugins);

    return {
      mapper: this.getMapperServicePublicApis()
    };
  }

  private getMapperServicePublicApis(): MapperServicePublicApis {
    const mapperService = this.mapper!;
    return {
      mapToIngestPipeline: (file: string, renameAction?: FieldRenameAction) => mapperService.mapToIngestPipeline(file, renameAction)
    };
  }
}
