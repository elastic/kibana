/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Headers } from '@kbn/core/server';
import { CancellationToken, TaskRunResult } from '@kbn/reporting-common';
import apm from 'elastic-apm-node';
import * as Rx from 'rxjs';
import { catchError, map, mergeMap, takeUntil, tap } from 'rxjs';
import { Writable } from 'stream';
import {
  LICENSE_TYPE_CLOUD_STANDARD,
  LICENSE_TYPE_ENTERPRISE,
  LICENSE_TYPE_GOLD,
  LICENSE_TYPE_PLATINUM,
  LICENSE_TYPE_TRIAL,
  PDF_JOB_TYPE_V2,
  PDF_REPORT_TYPE_V2,
  REPORTING_TRANSACTION_TYPE,
} from '../../../common/constants';
import { JobParamsPDFV2, UrlOrUrlLocatorTuple } from '../../../common/types';
import { TaskPayloadPDFV2 } from '../../../common/types/export_types/printable_pdf_v2';
import { decryptJobHeaders, ExportType, getCustomLogo } from '../common';
import { getFullRedirectAppUrl } from '../common/v2/get_full_redirect_app_url';
import { generatePdfObservable } from './lib/generate_pdf';

export class PdfExportType extends ExportType<JobParamsPDFV2, TaskPayloadPDFV2> {
  id = PDF_REPORT_TYPE_V2;
  name = 'PDF';
  jobType = PDF_JOB_TYPE_V2;
  jobContentEncoding = 'base64' as const;
  jobContentExtension = 'pdf' as const;
  validLicenses = [
    LICENSE_TYPE_TRIAL,
    LICENSE_TYPE_CLOUD_STANDARD,
    LICENSE_TYPE_GOLD,
    LICENSE_TYPE_PLATINUM,
    LICENSE_TYPE_ENTERPRISE,
  ];

  constructor(...args: ConstructorParameters<typeof ExportType>) {
    super(...args);
    this.logger = this.logger.get('pdf-export-v2');
  }

  /**
   * @param JobParamsPDFV2
   * @returns jobParams
   */
  public createJob = async ({ locatorParams, ...jobParams }: JobParamsPDFV2) => {
    return {
      ...jobParams,
      locatorParams,
      isDeprecated: false,
      browserTimezone: jobParams.browserTimezone,
      forceNow: new Date().toISOString(),
    };
  };

  /**
   *
   * @param jobId
   * @param payload
   * @param cancellationToken
   * @param stream
   */
  public runTask = (
    jobId: string,
    payload: TaskPayloadPDFV2,
    cancellationToken: CancellationToken,
    stream: Writable
  ) => {
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
        let urls: UrlOrUrlLocatorTuple[];
        if (locatorParams) {
          urls = locatorParams.map((locator) => [
            getFullRedirectAppUrl(
              this.config,
              this.getServerInfo(),
              payload.spaceId,
              payload.forceNow
            ),
            locator,
          ]) as unknown as UrlOrUrlLocatorTuple[];
        }

        apmGetAssets?.end();

        apmGeneratePdf = apmTrans?.startSpan('generate-pdf-pipeline', 'execute');
        return generatePdfObservable(
          this.config,
          this.getServerInfo(),
          () =>
            this.startDeps.reporting.getScreenshots({
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
        return Rx.throwError(() => err);
      })
    );

    const stop$ = Rx.fromEventPattern(cancellationToken.on);

    apmTrans?.end();
    return Rx.firstValueFrom(process$.pipe(takeUntil(stop$)));
  };
}
