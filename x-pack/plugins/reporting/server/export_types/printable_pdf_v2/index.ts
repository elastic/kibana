/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import apm from 'elastic-apm-node';
import { CancellationToken, TaskRunResult } from '@kbn/reporting-common';
import { PdfScreenshotOptions, PdfScreenshotResult } from '@kbn/screenshotting-plugin/server';
import { Writable } from 'stream';
import * as Rx from 'rxjs';
import { catchError, map, mergeMap, takeUntil, tap } from 'rxjs';
import { UrlOrUrlWithContext } from '@kbn/screenshotting-plugin/server/screenshots';
import { Headers } from '@kbn/core/server';
import {
  REPORTING_REDIRECT_LOCATOR_STORE_KEY,
  REPORTING_TRANSACTION_TYPE,
  PDF_JOB_TYPE_V2,
  PDF_REPORT_TYPE_V2,
} from '../../../common/constants';
import { JobParamsPDFV2 } from '../../../common/types';
import { TaskPayloadPDFV2 } from '../../../common/types/export_types/printable_pdf_v2';
import {
  decryptJobHeaders,
  ExportType,
  ExportTypeSetupDeps,
  ExportTypeStartDeps,
  getCustomLogo,
} from '../common';
import { generatePdfObservable } from './lib/generate_pdf';
import { getFullRedirectAppUrl } from '../common/v2/get_full_redirect_app_url';
export type {
  JobParamsPDFV2,
  TaskPayloadPDFV2,
} from '../../../common/types/export_types/printable_pdf_v2';
/**
 * @TODO move to be within @kbn-reporting-export-types
 */
export class PdfExportType extends ExportType {
  id = PDF_REPORT_TYPE_V2;
  name = 'PDF';
  jobType = PDF_JOB_TYPE_V2;
  jobContentEncoding = 'base64' as const;
  jobContentExtension = 'pdf' as const;
  super() {
    this.logger = this.logger.get('pdf-export');
  }

  setup(setupDeps: ExportTypeSetupDeps) {
    this.setupDeps = setupDeps;
  }

  start(startDeps: ExportTypeStartDeps) {
    this.startDeps = startDeps;
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
  public async runTask(
    payload: TaskPayloadPDFV2,
    jobId: string,
    cancellationToken: CancellationToken,
    stream: Writable
  ) {
    const jobLogger = this.logger.get(`execute-job:${jobId}`);
    const apmTrans = apm.startTransaction('execute-job-pdf-v2', REPORTING_TRANSACTION_TYPE);
    const apmGetAssets = apmTrans?.startSpan('get-assets', 'setup');
    let apmGeneratePdf: { end: () => void } | null | undefined;
    const { encryptionKey } = this.config;

    const process$: Rx.Observable<TaskRunResult> = Rx.of(1).pipe(
      mergeMap(() => decryptJobHeaders(encryptionKey, payload.headers, jobLogger)),
      mergeMap(async (headers: Headers) => {
        const fakeRequest = this.getFakeRequest(headers, payload.spaceId, jobLogger);
        const uiSettingsClient = await this.getUiSettingsClient(fakeRequest);
        return await getCustomLogo(uiSettingsClient, headers);
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

        apmGetAssets?.end();

        apmGeneratePdf = apmTrans?.startSpan('generate-pdf-pipeline', 'execute');
        return generatePdfObservable(
          this.config,
          this.getServerInfo(),
          () =>
            this.getScreenshots({
              format: 'pdf',
              title,
              logo,
              browserTimezone,
              headers,
              layout,
              urls,
            }),
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
    return Rx.firstValueFrom(process$.pipe(takeUntil(stop$)));
  }
}
