/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import apm from 'elastic-apm-node';
import {
  CoreKibanaRequest,
  FakeRawRequest,
  KibanaRequest,
  Logger,
  Headers,
  IBasePath,
  SavedObjectsServiceStart,
  UiSettingsServiceStart,
  PluginInitializerContext,
  SavedObjectsClientContract,
  CoreSetup,
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
import { LicenseType } from '@kbn/licensing-plugin/common/types';
import { UrlOrUrlWithContext } from '@kbn/screenshotting-plugin/server/screenshots';
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
import { getFullRedirectAppUrl } from '../common/v2/get_full_redirect_app_url';
export type {
  JobParamsPDFV2,
  TaskPayloadPDFV2,
} from '../../../common/types/export_types/printable_pdf_v2';

/**
 * @TODO move to be within @kbn-reporting-export-types
 */
export interface PdfExportTypeSetupDeps {
  basePath: Pick<IBasePath, 'set'>;
  spaces?: SpacesPluginSetup;
  logger: Logger;
}

export interface PdfExportTypeStartDeps {
  savedObjects: SavedObjectsServiceStart;
  uiSettings: UiSettingsServiceStart;
  screenshotting: ScreenshottingStart;
  logger: Logger;
}

export class PdfExportType
  implements
    ExportType<PdfExportTypeSetupDeps, PdfExportTypeStartDeps, JobParamsPDFV2, TaskPayloadPDFV2>
{
  id = 'printablePdfV2';
  name = 'PDF';
  validLicenses: LicenseType[] = [
    LICENSE_TYPE_TRIAL,
    LICENSE_TYPE_CLOUD_STANDARD,
    LICENSE_TYPE_GOLD,
    LICENSE_TYPE_PLATINUM,
    LICENSE_TYPE_ENTERPRISE,
  ];
  jobType = PDF_JOB_TYPE_V2;
  jobContentEncoding = 'base64' as const;
  jobContentExtension = 'pdf' as const;
  setupDeps!: PdfExportTypeSetupDeps;
  startDeps!: PdfExportTypeStartDeps;

  constructor(
    private core: CoreSetup,
    private config: ReportingConfigType,
    private logger: Logger,
    private context: PluginInitializerContext<ReportingConfigType>
  ) {
    this.logger = logger.get('pdf-export');
  }

  setup(setupDeps: PdfExportTypeSetupDeps) {
    this.setupDeps = setupDeps;
    // console.log('setupDeps', Object.keys(setupDeps));
  }

  start(startDeps: PdfExportTypeStartDeps) {
    this.startDeps = startDeps;
    console.log('startDeps', Object.keys(startDeps));
  }

  private async getSavedObjectsClient(request: KibanaRequest) {
    const { savedObjects } = this.startDeps;

    return savedObjects.getScopedClient(request) as SavedObjectsClientContract;
  }

  public async getUiSettingsServiceFactory(savedObjectsClient: SavedObjectsClientContract) {
    const { uiSettings: uiSettingsService } = await this.startDeps;
    const scopedUiSettingsService = await uiSettingsService.asScopedToClient(savedObjectsClient);
    return scopedUiSettingsService;
  }

  public async getUiSettingsClient(
    request: KibanaRequest,
    spaceId: string | undefined,
    logger = this.logger
  ) {
    // const spacesService = this.setupDeps.spaces?.spacesService;
    if (spaceId) {
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

    // const spacesService = this.setupDeps?.spaces?.spacesService;
    if (spaceId && spaceId !== DEFAULT_SPACE_ID) {
      logger.info(`Generating request for space: ${spaceId}`);
      this.setupDeps?.basePath.set(fakeRequest, `/s/${spaceId}`);
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

  public getScreenshots(options: PdfScreenshotOptions): Rx.Observable<PdfScreenshotResult> {
    return Rx.defer(() => {
      return this.startDeps.screenshotting.getScreenshots({
        ...options,
        urls: options.urls.map((url) =>
          typeof url === 'string'
            ? url
            : [url[0], { [REPORTING_REDIRECT_LOCATOR_STORE_KEY]: url[1] }]
        ),
      } as PdfScreenshotOptions);
    });
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
    stream: Writable,
    getUiSettingsClient: Function
  ) {
    const jobLogger = this.logger.get(`execute-job:${jobId}`);
    const apmTrans = apm.startTransaction('execute-job-pdf-v2', REPORTING_TRANSACTION_TYPE);
    const apmGetAssets = apmTrans?.startSpan('get-assets', 'setup');
    let apmGeneratePdf: { end: () => void } | null | undefined;
    const { encryptionKey } = this.config;

    const process$: Rx.Observable<TaskRunResult> = Rx.of(1).pipe(
      mergeMap(() => decryptJobHeaders(encryptionKey, payload.headers, jobLogger)),
      mergeMap(async (headers) => {
        const fakeRequest = await this.getFakeRequest(headers, payload.spaceId, jobLogger);
        const uiSettingsClient = await getUiSettingsClient(fakeRequest, jobLogger);
        return getCustomLogo(uiSettingsClient, headers);
      }),
      mergeMap(({ logo, headers }) => {
        const { browserTimezone, layout, title, locatorParams } = payload;
        const urls = locatorParams.map((locator) => [
          getFullRedirectAppUrl(
            this.config,
            this.getServerInfo(),
            payload.spaceId,
            payload.forceNow
          ),
          locator,
        ]) as unknown as UrlOrUrlWithContext[];

        const screenshotFn: GetScreenshotsFn = () =>
          this.getScreenshots({
            format: 'pdf',
            title,
            logo,
            browserTimezone,
            headers,
            layout,
            urls,
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
    return Rx.lastValueFrom(process$.pipe(takeUntil(stop$)));
  }
}
