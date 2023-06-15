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
  HttpServiceSetup,
} from '@kbn/core/server';
import { LicenseType } from '@kbn/licensing-plugin/server';
import { CancellationToken, TaskRunResult } from '@kbn/reporting-common';
import {
  PngScreenshotOptions,
  PngScreenshotResult,
  ScreenshottingStart,
} from '@kbn/screenshotting-plugin/server';
import { DEFAULT_SPACE_ID } from '@kbn/spaces-plugin/common';
import { SpacesPluginSetup } from '@kbn/spaces-plugin/server';
import { Writable } from 'stream';
import * as Rx from 'rxjs';
import { finalize, map, mergeMap, takeUntil, tap } from 'rxjs';
import {
  LICENSE_TYPE_CLOUD_STANDARD,
  LICENSE_TYPE_ENTERPRISE,
  LICENSE_TYPE_GOLD,
  LICENSE_TYPE_PLATINUM,
  LICENSE_TYPE_TRIAL,
  PNG_JOB_TYPE_V2,
  PNG_REPORT_TYPE_V2,
  REPORTING_REDIRECT_LOCATOR_STORE_KEY,
  REPORTING_TRANSACTION_TYPE,
} from '../../../common/constants';
import { ReportingConfigType } from '../../config';
import { ReportingServerInfo } from '../../core';
import { decryptJobHeaders, ExportType, generatePngObservable } from '../common';
import { JobParamsPNGV2, TaskPayloadPNGV2 } from './types';
import { getFullRedirectAppUrl } from '../common/v2/get_full_redirect_app_url';

/*
 * @TODO move to be within @kbn/reporting-export-types
 */
export interface PngExportTypeSetupDeps {
  basePath: Pick<IBasePath, 'set'>;
  spaces?: SpacesPluginSetup;
  logger: Logger;
}

export interface PngExportTypeStartDeps {
  savedObjects: SavedObjectsServiceStart;
  uiSettings: UiSettingsServiceStart;
  screenshotting: ScreenshottingStart;
  logger: Logger;
}

export class PngExportType
  implements
    ExportType<PngExportTypeSetupDeps, PngExportTypeStartDeps, JobParamsPNGV2, TaskPayloadPNGV2>
{
  private http: HttpServiceSetup;

  id = PNG_REPORT_TYPE_V2;
  name = 'PNG';
  validLicenses: LicenseType[] = [
    LICENSE_TYPE_TRIAL,
    LICENSE_TYPE_CLOUD_STANDARD,
    LICENSE_TYPE_GOLD,
    LICENSE_TYPE_PLATINUM,
    LICENSE_TYPE_ENTERPRISE,
  ];
  jobType = PNG_JOB_TYPE_V2;
  jobContentEncoding = 'base64' as const;
  jobContentExtension = 'png' as const;
  setupDeps!: PngExportTypeSetupDeps;
  startDeps!: PngExportTypeStartDeps;

  constructor(
    core: CoreSetup,
    private config: ReportingConfigType,
    private logger: Logger,
    private context: PluginInitializerContext<ReportingConfigType>
  ) {
    this.logger = logger.get('pdf-export');
    this.http = core.http;
  }

  setup(setupDeps: PngExportTypeSetupDeps) {
    this.setupDeps = setupDeps;
  }

  start(startDeps: PngExportTypeStartDeps) {
    this.startDeps = startDeps;
  }

  public getSpaceId(request: KibanaRequest, logger = this.logger): string | undefined {
    const spacesService = this.setupDeps!.spaces?.spacesService;
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
    const { savedObjects } = this.startDeps;
    return savedObjects.getScopedClient(request) as SavedObjectsClientContract;
  }

  public getUiSettingsServiceFactory(savedObjectsClient: SavedObjectsClientContract) {
    const { uiSettings: uiSettingsService } = this.startDeps;
    const scopedUiSettingsService = uiSettingsService.asScopedToClient(savedObjectsClient);
    return scopedUiSettingsService;
  }

  public async getUiSettingsClient(request: KibanaRequest, logger = this.logger) {
    const spacesService = this.setupDeps.spaces?.spacesService;
    const spaceId = await this.getSpaceId(request, logger);

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

    const spacesService = this.setupDeps.spaces?.spacesService;
    if (spacesService) {
      if (spaceId && spaceId !== DEFAULT_SPACE_ID) {
        logger.info(`Generating request for space: ${spaceId}`);
        this.setupDeps.basePath.set(fakeRequest, `/s/${spaceId}`);
      }
    }
    return fakeRequest;
  }

  public getScreenshots(options: PngScreenshotOptions): Rx.Observable<PngScreenshotResult> {
    return Rx.defer(() => {
      return this.startDeps.screenshotting.getScreenshots({
        ...options,
        urls: options.urls.map((url) =>
          typeof url === 'string'
            ? url
            : [url[0], { [REPORTING_REDIRECT_LOCATOR_STORE_KEY]: url[1] }]
        ),
      } as PngScreenshotOptions);
    });
  }

  /*
   * Returns configurable server info
   */
  public getServerInfo(): ReportingServerInfo {
    const serverInfo = this.http.getServerInfo();
    return {
      basePath: this.http.basePath.serverBasePath,
      hostname: serverInfo.hostname,
      name: serverInfo.name,
      port: serverInfo.port,
      uuid: this.context.env.instanceUuid,
      protocol: serverInfo.protocol,
    };
  }

  /**
   * @params JobParamsPNGV2
   * @returns jobParams
   */
  public createJob({ locatorParams, ...jobParams }: JobParamsPNGV2) {
    return {
      ...jobParams,
      locatorParams: [locatorParams],
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
    payload: TaskPayloadPNGV2,
    jobId: string,
    cancellationToken: CancellationToken,
    stream: Writable
  ) {
    const jobLogger = this.logger.get(`execute-job:${jobId}`);
    const apmTrans = apm.startTransaction('execute-job-pdf-v2', REPORTING_TRANSACTION_TYPE);
    const apmGetAssets = apmTrans?.startSpan('get-assets', 'setup');
    let apmGeneratePng: { end: () => void } | null | undefined;
    const { encryptionKey } = this.config;

    const process$: Rx.Observable<TaskRunResult> = Rx.of(1).pipe(
      mergeMap(() => decryptJobHeaders(encryptionKey, payload.headers, jobLogger)),
      mergeMap((headers) => {
        const url = getFullRedirectAppUrl(
          this.config,
          this.getServerInfo(),
          payload.spaceId,
          payload.forceNow
        );
        const [locatorParams] = payload.locatorParams;

        apmGetAssets?.end();
        apmGeneratePng = apmTrans?.startSpan('generate-png-pipeline', 'execute');

        const screenshotFn = () =>
          this.getScreenshots({
            headers,
            browserTimezone: payload.browserTimezone,
            layout: { ...payload.layout, id: 'preserve_layout' },
            urls: [[url, locatorParams]],
          });

        return generatePngObservable(screenshotFn, jobLogger, {
          headers,
          browserTimezone: payload.browserTimezone,
          layout: { ...payload.layout, id: 'preserve_layout' },
          urls: [[url, locatorParams]],
        });
      }),
      tap(({ buffer }) => stream.write(buffer)),
      map(({ metrics, warnings }) => ({
        content_type: 'image/png',
        metrics: { png: metrics },
        warnings,
      })),
      tap({ error: (error) => jobLogger.error(error) }),
      finalize(() => apmGeneratePng?.end())
    );

    const stop$ = Rx.fromEventPattern(cancellationToken.on);
    return Rx.lastValueFrom(process$.pipe(takeUntil(stop$)));
  }
}
