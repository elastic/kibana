/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup } from '@kbn/core-lifecycle-server';
import { PluginInitializerContext } from '@kbn/core-plugins-server';
import {
  ScreenshottingStart,
  PdfScreenshotResult,
  ScreenshotOptions,
} from '@kbn/screenshotting-plugin/server';
import * as Rx from 'rxjs';
import { Logger } from '@kbn/core/server';
import { REPORTING_REDIRECT_LOCATOR_STORE_KEY } from '../../../common/constants';
import { ReportingConfigType, createConfig } from '../../config';
import { ReportingServerInfo } from '../../core';
import { CreateJobFn, PdfScreenshotOptions, RunTaskFn } from '../../types';

export type {
  JobParamsPDFDeprecated,
  TaskPayloadPDF,
} from '../../../common/types/export_types/printable_pdf';

export type CreateJobFnFactory<CreateJobFnType> = (
  reporting: PdfCore,
  logger: Logger
) => CreateJobFnType;

export type RunTaskFnFactory<RunTaskFnType> = (reporting: PdfCore, logger: Logger) => RunTaskFnType;

interface PdfInternalStart {
  screenshotting: ScreenshottingStart;
}

export class PdfCore {
  private pluginStartDeps!: PdfInternalStart;
  private config: ReportingConfigType;

  constructor(
    private core: CoreSetup,
    private logger: Logger,
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

  getScreenshots(options: PdfScreenshotOptions): Rx.Observable<PdfScreenshotResult>;
  getScreenshots(options: PdfScreenshotOptions) {
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

export interface ExportTypeDefinitionPdf<
  CreateJobFnType = CreateJobFn | null,
  RunTaskFnType = RunTaskFn
> {
  id: string;
  name: string;
  jobType: string;
  jobContentEncoding?: string;
  jobContentExtension: string;
  createJobFnFactory: CreateJobFnFactory<CreateJobFnType> | null; // immediate job does not have a "create" phase
  runTaskFnFactory: RunTaskFnFactory<RunTaskFnType>;
  validLicenses: string[];
}
