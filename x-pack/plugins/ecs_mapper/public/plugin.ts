/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DevToolsSetup } from 'src/plugins/dev_tools/public';
import { LicensingPluginSetup } from '../../licensing/public';
import { FileUploadPluginStart } from '../../file_upload/public';
import { Plugin, CoreSetup, CoreStart, ApplicationStart } from '../../../../src/core/public';

import { HomePublicPluginSetup } from '../../../../src/plugins/home/public';
import { registerDevTool, registerHomeFeatureCatalogue } from './registration';
import { setStartServices } from './kibana_services';
import { FieldCopyAction } from '../common';
import { MapperClient } from './application/mapper_api';

/**
 * Publicly exposed APIs from the Mapper Service
 */
export interface MapperServicePublicApis {
  /** description todo */
  mapToIngestPipeline: (file: string, renanmeAction: FieldCopyAction) => object;
}

export interface EcsMapperSetupDependencies {
  home?: HomePublicPluginSetup;
  devTools: DevToolsSetup;
  licensing: LicensingPluginSetup;
}
export interface EcsMapperStartDependencies {
  fileUpload: FileUploadPluginStart;
  mapper: MapperClient;
  application: ApplicationStart;
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
  private mapper?: MapperClient;

  public setup(core: CoreSetup, plugins: EcsMapperSetupDependencies) {
    const http = core.http;
    const notifications = core.notifications;
    this.mapper = new MapperClient({ http, notifications });

    if (plugins.home) {
      registerHomeFeatureCatalogue(plugins.home);
    }
    registerDevTool(plugins, core);

    return {
      mapper: this.getMapperServicePublicApis(),
    };
  }

  public start(core: CoreStart, plugins: EcsMapperStartDependencies) {
    if (!this.mapper) {
      throw Error('ECS Mapper plugin failed to initialize properly.');
    }

    plugins.mapper = this.mapper;
    setStartServices(core, plugins);

    return {
      mapper: this.getMapperServicePublicApis(),
    };
  }

  private getMapperServicePublicApis(): MapperServicePublicApis {
    const mapperClient = this.mapper!;
    return {
      mapToIngestPipeline: (file: string, copyAction: FieldCopyAction) =>
        mapperClient.fetchPipelineFromMapping(file, copyAction),
    };
  }
}
