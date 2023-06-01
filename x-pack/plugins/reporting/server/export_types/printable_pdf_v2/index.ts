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
import { catchError, map, mergeMap, takeUntil, tap } from 'rxjs';
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
import { ReportingServerInfo } from '../../core';
import { decryptJobHeaders, ExportType, getCustomLogo } from '../common';
import { generatePdfObservable, GetScreenshotsFn } from './lib/generate_pdf';
export type {
  JobParamsPDFV2,
  TaskPayloadPDFV2,
} from '../../../common/types/export_types/printable_pdf_v2';

/** @TODO move to be within @kbn-reporting-export-types */
export interface PdfExportTypeSetupDeps {
  basePath: Pick<IBasePath, 'set'>;
  spaces: SpacesPluginSetup;
  logger: Logger;
}

export interface PdfExportTypeStartupDeps {
  savedObjects: SavedObjectsServiceStart;
  uiSettings: UiSettingsServiceStart;
  screenshotting: ScreenshottingStart;
  logger: Logger;
}

export class PdfExportType implements ExportType {
  id = 'printable_pdf_v2';
  name = 'PDF';
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
  setupDeps!: PdfExportTypeSetupDeps;
  startDeps!: PdfExportTypeStartupDeps;

  constructor(
    private core: CoreSetup,
    private config: ReportingConfigType,
    private logger: Logger,
    private context: PluginInitializerContext<ReportingConfigType>
  ) {
    this.logger = logger.get('pdf-export');
  }

  public setup(core: CoreSetup, setupDeps: PdfExportTypeSetupDeps) {
    this.setupDeps = setupDeps;
  }
  public start(core: CoreStart, startDeps: PdfExportTypeStartupDeps) {
    this.startDeps = startDeps;
  }

  public getSpaceId(request: KibanaRequest, logger = this.logger): string | undefined {
    const spacesService = this.setupDeps.spaces.spacesService;
    console.log(this.setupDeps.spaces);
    if (spacesService) {
      const spaceId = spacesService.getSpaceId(request);

      if (spaceId !== DEFAULT_SPACE_ID) {
        logger.info(`Request uses Space ID: ${spaceId}`);
        return spaceId;
      } else {
        logger.debug(`Request uses default Space`);
      }
    }
  }

  private async getSavedObjectsClient(request: KibanaRequest) {
    const { savedObjects } = await this.startDeps;
    return savedObjects.getScopedClient(request) as SavedObjectsClientContract;
  }

  public async getUiSettingsServiceFactory(savedObjectsClient: SavedObjectsClientContract) {
    const { uiSettings: uiSettingsService } = await this.startDeps;
    const scopedUiSettingsService = uiSettingsService.asScopedToClient(savedObjectsClient);
    return scopedUiSettingsService;
  }

  public async getUiSettingsClient(request: KibanaRequest, logger = this.logger) {
    const spacesService = this.setupDeps.spaces.spacesService;
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

    const spacesService = this.setupDeps.spaces.spacesService;
    if (spacesService) {
      if (spaceId && spaceId !== DEFAULT_SPACE_ID) {
        logger.info(`Generating request for space: ${spaceId}`);
        this.setupDeps.basePath.set(fakeRequest, `/s/${spaceId}`);
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
    return this.startDeps.screenshotting.getScreenshots({
      ...options,
      urls: options.urls
        ? options.urls.map((url) =>
            typeof url === 'string'
              ? url
              : [url[0], { [REPORTING_REDIRECT_LOCATOR_STORE_KEY]: url[1] }]
          )
        : null,
    } as PdfScreenshotOptions);
  }

  /**
   * @param JobParamsPDFV2
   * @returns jobParams
   */
  public createJob({ locatorParams, ...jobParams }: JobParamsPDFV2) {
    return {
      ...jobParams,
      locatorParams,
      isDeprecated: false,
      browserTimezone: jobParams.browserTimezone,
      forceNow: new Date().toISOString(),
    };
  }

  /**
   *
   * @param jobId
   * @param payload
   * @param cancellationToken
   * @param stream
   */
  async runTask(
    jobId: string,
    payload: TaskPayloadPDFV2,
    cancellationToken: CancellationToken,
    stream: Writable
  ) {
    // use the dependencies to execute the job and return the content through the stream
    const { encryptionKey } = this.config;
    const pdfPerformJob = async () => {
      const jobLogger = this.logger.get(`execute-job:${jobId}`);
      const apmTrans = apm.startTransaction('execute-job-pdf-v2', REPORTING_TRANSACTION_TYPE);
      const apmGetAssets = apmTrans?.startSpan('get-assets', 'setup');

      let apmGeneratePdf: { end: () => void } | null | undefined;

      const process$: Rx.Observable<TaskRunResult> = Rx.of(1).pipe(
        mergeMap(() => decryptJobHeaders(encryptionKey, payload.headers, jobLogger)),
        mergeMap(async (headers) => {
          const fakeRequest = this.getFakeRequest(headers, payload.spaceId, jobLogger);
          const uiSettingsClient = await this.getUiSettingsClient(fakeRequest);
          const result = getCustomLogo(uiSettingsClient, headers);
          return result;
        }),
        mergeMap(({ logo, headers }) => {
          const { browserTimezone, layout, title, locatorParams } = payload;
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
            payload,
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
      const rsu = process$.pipe(takeUntil(stop$));
      const result = Rx.firstValueFrom(rsu);
      return await result;
    };
    return pdfPerformJob();
  }
}
