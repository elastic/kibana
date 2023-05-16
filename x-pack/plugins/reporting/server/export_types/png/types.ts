/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  PngScreenshotResult,
  ScreenshottingStart,
  ScreenshotOptions,
} from '@kbn/screenshotting-plugin/server';
import type { CoreSetup, Logger, PluginInitializerContext } from '@kbn/core/server';
import * as Rx from 'rxjs';
import type { PngScreenshotOptions, ReportingPluginRouter } from '../../types';
import { REPORTING_REDIRECT_LOCATOR_STORE_KEY } from '../../../common/constants';
import { ReportingConfigType, createConfig } from '../../config';
import { ReportingServerInfo } from '../../core';

export type {
  JobParamsPNGDeprecated,
  TaskPayloadPNG,
} from '../../../common/types/export_types/png';

export type CreateJobFnFactory<CreateJobFnType> = (
  reporting: PngCore,
  logger: Logger
) => CreateJobFnType;

export type RunTaskFnFactory<RunTaskFnType> = (reporting: PngCore, logger: Logger) => RunTaskFnType;

interface PngInternalSetup {
  router: ReportingPluginRouter;
}

interface PngInternalStart {
  screenshotting: ScreenshottingStart;
}

export class PngCore {
  getDeprecatedAllowedRoles() {
    throw new Error('Method not implemented.');
  }
  private pluginStartDeps!: PngInternalStart;
  private config: ReportingConfigType;
  core!: CoreSetup;
  router!: PngInternalSetup['router'];

  constructor(
    core: CoreSetup,
    logger: Logger,
    private context: PluginInitializerContext<ReportingConfigType>
  ) {
    const config = createConfig(core, context.config.get<ReportingConfigType>(), logger);
    this.config = config;
  }

  /*
   * Gives synchronous access to the config
   */
  public getConfig(): ReportingConfigType {
    return this.config;
  }

  /*
   * Returns configurable server info
   */
  public getServerInfo(): ReportingServerInfo {
    const { http } = this.core;
    const serverInfo = http.getServerInfo();
    return {
      basePath: this.core.http.basePath.serverBasePath,
      hostname: serverInfo.hostname,
      name: serverInfo.name,
      port: serverInfo.port,
      uuid: this.context.env.instanceUuid,
      protocol: serverInfo.protocol,
    };
  }

  getScreenshots(options: PngScreenshotOptions): Rx.Observable<PngScreenshotResult>;
  getScreenshots(options: PngScreenshotOptions) {
    return Rx.defer(() => {
      return this.pluginStartDeps.screenshotting.getScreenshots({
        ...options,
        urls: options.urls.map((url) =>
          typeof url === 'string'
            ? url
            : [url[0], { [REPORTING_REDIRECT_LOCATOR_STORE_KEY]: url[1] }]
        ),
      } as ScreenshotOptions);
    });
  }
}
