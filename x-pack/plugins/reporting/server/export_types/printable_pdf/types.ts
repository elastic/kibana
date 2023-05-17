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
import {
  Logger,
  IBasePath,
  SavedObjectsServiceStart,
  UiSettingsServiceStart,
  CoreKibanaRequest,
  FakeRawRequest,
  KibanaRequest,
  Headers,
  SavedObjectsClientContract,
} from '@kbn/core/server';
import { SpacesPluginSetup } from '@kbn/spaces-plugin/server';
import { switchMap } from 'rxjs';
import { DEFAULT_SPACE_ID } from '@kbn/spaces-plugin/common';
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

interface PdfCoreSetup {
  basePath: Pick<IBasePath, 'set'>;
  logger: Logger;
  spaces: SpacesPluginSetup;
}

interface PdfCoreStart {
  savedObjects: SavedObjectsServiceStart;
  uiSettings: UiSettingsServiceStart;
  screenshotting: ScreenshottingStart;
}

export class PdfCore {
  pluginSetupDeps?: PdfCoreSetup;
  pluginStartDeps?: PdfCoreStart;
  config: ReportingConfigType;
  readonly pluginStart$ = new Rx.ReplaySubject<PdfCoreStart>(); // observe async background startDeps

  constructor(
    public core: CoreSetup,
    public logger: Logger,
    public context: PluginInitializerContext<ReportingConfigType>
  ) {
    const config = createConfig(core, context.config.get<ReportingConfigType>(), logger);
    this.config = config;
  }

  /*
   * Gives synchronous access to the setupDeps
   */
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

  getScreenshots(options: PdfScreenshotOptions): Rx.Observable<PdfScreenshotResult>;
  getScreenshots(options: PdfScreenshotOptions) {
    return Rx.defer(() => this.getPluginStartDeps()).pipe(
      switchMap(({ screenshotting }) => {
        return screenshotting.getScreenshots({
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

  // for get_custom_logo
  public getFakeRequest(
    headers: Headers,
    spaceId: string | undefined,
    logger = this.logger
  ): KibanaRequest {
    const rawRequest: FakeRawRequest = {
      headers,
      path: '/',
    };
    const fakeRequest = CoreKibanaRequest.from(rawRequest);

    const spacesService = this.getPluginSetupDeps().spaces?.spacesService;
    if (spacesService) {
      if (spaceId && spaceId !== DEFAULT_SPACE_ID) {
        logger.info(`Generating request for space: ${spaceId}`);
        this.getPluginSetupDeps().basePath.set(fakeRequest, `/s/${spaceId}`);
      }
    }

    return fakeRequest;
  }

  public async getUiSettingsClient(request: KibanaRequest, logger = this.logger) {
    const spacesService = this.getPluginSetupDeps().spaces?.spacesService;
    const spaceId = this.getSpaceId(request, logger);
    if (spacesService && spaceId) {
      logger.info(`Creating UI Settings Client for space: ${spaceId}`);
    }
    const savedObjectsClient = await this.getSavedObjectsClient(request);
    return await this.getUiSettingsServiceFactory(savedObjectsClient);
  }

  public async getSavedObjectsClient(request: KibanaRequest) {
    const { savedObjects } = await this.getPluginStartDeps();
    return savedObjects.getScopedClient(request) as SavedObjectsClientContract;
  }

  public async getUiSettingsServiceFactory(savedObjectsClient: SavedObjectsClientContract) {
    const { uiSettings: uiSettingsService } = await this.getPluginStartDeps();
    const scopedUiSettingsService = uiSettingsService.asScopedToClient(savedObjectsClient);
    return scopedUiSettingsService;
  }

  public getSpaceId(request: KibanaRequest, logger = this.logger): string | undefined {
    const spacesService = this.getPluginSetupDeps().spaces?.spacesService;
    if (spacesService) {
      const spaceId = spacesService?.getSpaceId(request);

      if (spaceId !== DEFAULT_SPACE_ID) {
        logger.info(`Request uses Space ID: ${spaceId}`);
        return spaceId;
      } else {
        logger.debug(`Request uses default Space`);
      }
    }
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
  createJobFnFactory: CreateJobFnFactory<CreateJobFnType>;
  runTaskFnFactory: RunTaskFnFactory<RunTaskFnType>;
  validLicenses: string[];
}
