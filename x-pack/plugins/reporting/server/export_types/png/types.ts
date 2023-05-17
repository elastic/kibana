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
import type {
  CoreSetup,
  CustomRequestHandlerContext,
  DocLinksServiceSetup,
  IRouter,
  Logger,
  PluginInitializerContext,
} from '@kbn/core/server';
import * as Rx from 'rxjs';
import { SecurityPluginSetup, SecurityPluginStart } from '@kbn/security-plugin/server';
import { UsageCounter } from '@kbn/usage-collection-plugin/server';
import { switchMap } from 'rxjs';
import { CreateJobFn, PngScreenshotOptions, RunTaskFn } from '../../types';
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

interface PngCoreSetup {
  router?: IRouter<CustomRequestHandlerContext<{}>>;
  docLinks: DocLinksServiceSetup;
  security?: SecurityPluginSetup;
  logger: Logger;
  usageCounter?: UsageCounter;
}

interface PngCoreStart {
  screenshotting?: ScreenshottingStart;
  security?: SecurityPluginStart;
}

export class PngCore {
  config: ReportingConfigType;
  router?: IRouter<CustomRequestHandlerContext<{}>>;
  deprecatedAllowedRoles: false | string[];
  pluginSetupDeps?: PngCoreSetup;
  pluginStartDeps?: PngCoreStart;
  readonly pluginStart$ = new Rx.ReplaySubject<PngCoreStart>(); // observe async background startDeps

  constructor(
    public core: CoreSetup,
    public logger: Logger,
    public context: PluginInitializerContext<ReportingConfigType>
  ) {
    const config = createConfig(core, context.config.get<ReportingConfigType>(), logger);
    this.config = config;
    this.logger = logger;
    this.deprecatedAllowedRoles = config.roles.enabled ? config.roles.allow : false;
  }

  public getPluginSetupDeps() {
    if (!this.pluginSetupDeps) {
      throw new Error(`"pluginSetupDeps" dependencies haven't initialized yet`);
    }
    return this.pluginSetupDeps;
  }
  /*
   * Gives async access to the startDeps
   */
  public async getPluginStartDeps() {
    if (this.pluginStartDeps) {
      return this.pluginStartDeps;
    }

    return await Rx.firstValueFrom(this.pluginStart$);
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
    return Rx.defer(() => this.getPluginStartDeps()).pipe(
      switchMap(({ screenshotting }) => {
        return screenshotting!.getScreenshots({
          ...options,
          urls: options.urls.map((url) =>
            typeof url === 'string'
              ? url
              : [url[0], { [REPORTING_REDIRECT_LOCATOR_STORE_KEY]: url[1] }]
          ),
        } as ScreenshotOptions);
      })
    );
  }

  /*
   * If deprecated feature has not been disabled,
   * this returns an array of allowed role names
   * that have access to Reporting.
   */
  public getDeprecatedAllowedRoles(): string[] | false {
    return this.deprecatedAllowedRoles;
  }

  /*
   *
   * Track usage of code paths for telemetry
   */
  public getUsageCounter(): UsageCounter | undefined {
    return this.pluginSetupDeps?.usageCounter;
  }
}

export interface ExportTypeDefinitionPng<
  CreateJobFnType = CreateJobFn | null,
  RunTaskFnType = RunTaskFn
> {
  id: string;
  name: string;
  jobType: string;
  jobContentEncoding?: string;
  jobContentExtension: string;
  createJobFnFactory: CreateJobFnFactory<CreateJobFnType>;
  runTaskFnFactory: RunTaskFnFactory<RunTaskFnType>;
  validLicenses: string[];
}
