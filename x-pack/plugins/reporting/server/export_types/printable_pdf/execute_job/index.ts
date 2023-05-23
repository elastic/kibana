/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TaskRunResult } from '@kbn/reporting-common';
import apm from 'elastic-apm-node';
import * as Rx from 'rxjs';
import { catchError, map, mergeMap, takeUntil, tap } from 'rxjs/operators';
import { REPORTING_TRANSACTION_TYPE } from '../../../../common/constants';
import { RunTaskFn, RunTaskFnFactory } from '../../../types';
import { decryptJobHeaders, getCustomLogo, getFullUrls } from '../../common';
import { generatePdfObservable } from '../lib/generate_pdf';
import { TaskPayloadPDF } from '../types';

export const runTaskFnFactory: RunTaskFnFactory<RunTaskFn<TaskPayloadPDF>> =
  function executeJobFactoryFn(reporting, parentLogger) {
    const { encryptionKey } = reporting.getConfig();

    return async function runTask(jobId, job, cancellationToken, stream) {
      const jobLogger = parentLogger.get(`execute-job:${jobId}`);
      const apmTrans = apm.startTransaction('execute-job-pdf', REPORTING_TRANSACTION_TYPE);
      const apmGetAssets = apmTrans?.startSpan('get-assets', 'setup');
      let apmGeneratePdf: { end: () => void } | null | undefined;

      const process$: Rx.Observable<TaskRunResult> = Rx.of(1).pipe(
        mergeMap(() => decryptJobHeaders(encryptionKey, job.headers, jobLogger)),
        mergeMap(async (headers) => {
          const fakeRequest = reporting.getFakeRequest(headers, job.spaceId, jobLogger);
          const uiSettingsClient = await reporting.getUiSettingsClient(fakeRequest);
          return getCustomLogo(uiSettingsClient, headers);
        }),
        mergeMap(({ headers, logo }) => {
          const urls = getFullUrls(reporting.getServerInfo(), reporting.getConfig(), job);

          const { browserTimezone, layout, title } = job;
          apmGetAssets?.end();

          apmGeneratePdf = apmTrans?.startSpan('generate-pdf-pipeline', 'execute');
          //  make a new function that will call reporting.getScreenshots
          const snapshotFn = () =>
            reporting.getScreenshots({
              format: 'pdf',
              title,
              logo,
              urls,
              browserTimezone,
              headers,
              layout,
            });
          return generatePdfObservable(snapshotFn, {
            format: 'pdf',
            title,
            logo,
            urls,
            browserTimezone,
            headers,
            layout,
          });
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
  };
