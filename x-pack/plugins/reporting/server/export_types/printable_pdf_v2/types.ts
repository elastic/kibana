/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import apm from 'elastic-apm-node';
import {
  CoreKibanaRequest,
  CoreSetup,
  FakeRawRequest,
  KibanaRequest,
  Logger,
  Headers,
  IBasePath,
  SavedObjectsClientContract,
  SavedObjectsServiceStart,
  UiSettingsServiceStart,
  CoreStart,
  PluginInitializerContext,
} from '@kbn/core/server';
import { CancellationToken, TaskRunResult } from '@kbn/reporting-common';
import {
  PdfScreenshotOptions,
  PdfScreenshotResult,
  ScreenshottingStart,
} from '@kbn/screenshotting-plugin/server';
import { Writable } from 'stream';
import * as Rx from 'rxjs';
import { catchError, map, mergeMap, switchMap, takeUntil, tap } from 'rxjs';
import { DEFAULT_SPACE_ID } from '@kbn/spaces-plugin/common';
import { SpacesPluginSetup } from '@kbn/spaces-plugin/server';
import {
  LICENSE_TYPE_CLOUD_STANDARD,
  LICENSE_TYPE_ENTERPRISE,
  LICENSE_TYPE_GOLD,
  LICENSE_TYPE_PLATINUM,
  LICENSE_TYPE_TRIAL,
  REPORTING_REDIRECT_LOCATOR_STORE_KEY,
  REPORTING_TRANSACTION_TYPE,
  PDF_JOB_TYPE_V2,
} from '../../../common/constants';
import { JobParamsPDFV2 } from '../../../common/types';
import { TaskPayloadPDFV2 } from '../../../common/types/export_types/printable_pdf_v2';
import { ReportingConfigType } from '../../config';
import { decryptJobHeaders, getCustomLogo } from '../common';
import { ReportingServerInfo } from '../../core';
import { generatePdfObservable, GetScreenshotsFn } from './lib/generate_pdf';
import { metadata } from './metadata';
export type {
  JobParamsPDFV2,
  TaskPayloadPDFV2,
} from '../../../common/types/export_types/printable_pdf_v2';

interface PdfExportTypeSetupDeps {
  basePath: Pick<IBasePath, 'set'>;
  spaces?: SpacesPluginSetup;
  logger: Logger;
}

interface PdfExportTypeStartupDeps {
  savedObjects: SavedObjectsServiceStart;
  uiSettings: UiSettingsServiceStart;
  screenshotting: ScreenshottingStart;
  logger: Logger;
}

export class PdfExportType {
  private pluginSetupDeps?: PdfExportTypeSetupDeps;
  private pluginStartDeps?: PdfExportTypeStartupDeps;
  private readonly pluginStart$ = new Rx.ReplaySubject<PdfExportTypeStartupDeps>(); // observe async background startDeps
  id: string = metadata.id;
  validLicenses = [
    LICENSE_TYPE_TRIAL,
    LICENSE_TYPE_CLOUD_STANDARD,
    LICENSE_TYPE_GOLD,
    LICENSE_TYPE_PLATINUM,
    LICENSE_TYPE_ENTERPRISE,
  ];
  jobType = PDF_JOB_TYPE_V2;
  jobContentEncoding = 'base64';
  jobContentExtension = 'pdf';

  constructor(
    private core: CoreSetup,
    private config: ReportingConfigType,
    private logger: Logger,
    private context: PluginInitializerContext<ReportingConfigType>
  ) {
    this.logger = logger.get('pdf-export');
  }

  public setup(core: CoreSetup, setupDeps: PdfExportTypeSetupDeps) {}
  public start(core: CoreStart, setupDeps: PdfExportTypeStartupDeps) {}

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

  private async getSavedObjectsClient(request: KibanaRequest) {
    const { savedObjects } = await this.getPluginStartDeps();
    return savedObjects.getScopedClient(request) as SavedObjectsClientContract;
  }

  public async getUiSettingsServiceFactory(savedObjectsClient: SavedObjectsClientContract) {
    const { uiSettings: uiSettingsService } = await this.getPluginStartDeps();
    const scopedUiSettingsService = uiSettingsService.asScopedToClient(savedObjectsClient);
    return scopedUiSettingsService;
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

  public getScreenshots(options: PdfScreenshotOptions): Rx.Observable<PdfScreenshotResult>;
  public getScreenshots(options: PdfScreenshotOptions): Rx.Observable<PdfScreenshotResult> {
    return Rx.defer(() => this.getPluginStartDeps()).pipe(
      switchMap(({ screenshotting }) => {
        return screenshotting.getScreenshots({
          ...options,
          urls: options.urls
            ? options.urls.map((url) =>
                typeof url === 'string'
                  ? url
                  : [url[0], { [REPORTING_REDIRECT_LOCATOR_STORE_KEY]: url[1] }]
              )
            : null,
        } as PdfScreenshotOptions);
      })
    );
  }

  // export type CreateJobFnFactory<CreateJobFnType> = (
  //   reporting: ReportingCore,
  //   logger: Logger
  // ) => CreateJobFnType;
  public createJobFnFactory(jobParams: JobParamsPDFV2, logger: Logger) {
    return this.createJob(jobParams);
  }

  /**
   * @param JobParamsPDFV2
   * @returns jobParams
   */
  public createJob(jobParams: JobParamsPDFV2) {
    return {
      ...jobParams,
      forceNow: new Date().toISOString(),
    };
  }

  async runTask(
    jobId: string,
    job: TaskPayloadPDFV2,
    cancellationToken: CancellationToken,
    stream: Writable
  ) {
    // use the dependencies to execute the job and return the content through the stream
    const { encryptionKey } = this.config;
    return async () => {
      const jobLogger = this.logger.get(`execute-job:${jobId}`);
      const apmTrans = apm.startTransaction('execute-job-pdf-v2', REPORTING_TRANSACTION_TYPE);
      const apmGetAssets = apmTrans?.startSpan('get-assets', 'setup');

      let apmGeneratePdf: { end: () => void } | null | undefined;

      const process$: Rx.Observable<TaskRunResult> = Rx.of(1).pipe(
        mergeMap(() => decryptJobHeaders(encryptionKey, job.headers, jobLogger)),
        mergeMap(async (headers) => {
          const fakeRequest = this.getFakeRequest(headers, job.spaceId, jobLogger);
          const uiSettingsClient = await this.getUiSettingsClient(fakeRequest);
          const result = getCustomLogo(uiSettingsClient, headers);
          return result;
        }),
        mergeMap(({ logo, headers }) => {
          const { browserTimezone, layout, title, locatorParams } = job;

          const screenshotFn: GetScreenshotsFn = () =>
            this.getScreenshots({
              format: 'pdf',
              title,
              logo,
              browserTimezone,
              headers,
              layout,
            });
          apmGetAssets?.end();

          apmGeneratePdf = apmTrans?.startSpan('generate-pdf-pipeline', 'execute');
          return generatePdfObservable(
            this.config,
            this.getServerInfo(),
            screenshotFn,
            job,
            locatorParams,
            {
              format: 'pdf',
              title,
              logo,
              browserTimezone,
              headers,
              layout,
            }
          );
        }),
        tap(({ buffer }) => {
          apmGeneratePdf?.end();

          if (buffer) {
            stream.write(buffer);
          }
        }),
        map(({ metrics, warnings }) => ({
          content_type: 'application/pdf',
          metrics: { pdf: metrics },
          warnings,
        })),
        catchError((err) => {
          jobLogger.error(err);
          return Rx.throwError(err);
        })
      );

      const stop$ = Rx.fromEventPattern(cancellationToken.on);

      apmTrans?.end();
      return Rx.lastValueFrom(process$.pipe(takeUntil(stop$)));
    };
  }
}
