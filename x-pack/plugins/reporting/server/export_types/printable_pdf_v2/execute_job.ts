/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import apm from 'elastic-apm-node';
import * as Rx from 'rxjs';
import { catchError, map, mergeMap, takeUntil, tap } from 'rxjs/operators';
import { PDF_JOB_TYPE_V2, REPORTING_TRANSACTION_TYPE } from '../../../common/constants';
import { TaskRunResult } from '../../lib/tasks';
import { RunTaskFn, RunTaskFnFactory } from '../../types';
import {
  decryptJobHeaders,
  getConditionalHeaders,
  omitBlockedHeaders,
  getCustomLogo,
} from '../common';
import { generatePdfObservable } from './lib/generate_pdf';
import { TaskPayloadPDFV2 } from './types';

export const runTaskFnFactory: RunTaskFnFactory<RunTaskFn<TaskPayloadPDFV2>> =
  function executeJobFactoryFn(reporting, parentLogger) {
    const config = reporting.getConfig();
    const encryptionKey = config.get('encryptionKey');

    return async function runTask(jobId, job, cancellationToken, stream) {
      const jobLogger = parentLogger.clone([PDF_JOB_TYPE_V2, 'execute-job', jobId]);
      const apmTrans = apm.startTransaction('execute-job-pdf-v2', REPORTING_TRANSACTION_TYPE);
      const apmGetAssets = apmTrans?.startSpan('get-assets', 'setup');
      let apmGeneratePdf: { end: () => void } | null | undefined;

      const process$: Rx.Observable<TaskRunResult> = Rx.of(1).pipe(
        mergeMap(() => decryptJobHeaders(encryptionKey, job.headers, jobLogger)),
        map((decryptedHeaders) => omitBlockedHeaders(decryptedHeaders)),
        map((filteredHeaders) => getConditionalHeaders(config, filteredHeaders)),
        mergeMap((conditionalHeaders) =>
          getCustomLogo(reporting, conditionalHeaders, job.spaceId, jobLogger)
        ),
        mergeMap(({ logo, conditionalHeaders }) => {
          const { browserTimezone, layout, title, locatorParams } = job;
          apmGetAssets?.end();

          apmGeneratePdf = apmTrans?.startSpan('generate-pdf-pipeline', 'execute');
          return generatePdfObservable(
            reporting,
            jobLogger,
            job,
            title,
            locatorParams,
            {
              browserTimezone,
              conditionalHeaders,
              layout,
            },
            logo
          );
        }),
        tap(({ buffer, warnings }) => {
          apmGeneratePdf?.end();

          if (buffer) {
            stream.write(buffer);
          }
        }),
        map(({ warnings }) => ({
          content_type: 'application/pdf',
          warnings,
        })),
        catchError((err) => {
          jobLogger.error(err);
          return Rx.throwError(err);
        })
      );

      const stop$ = Rx.fromEventPattern(cancellationToken.on);

      apmTrans?.end();
      return process$.pipe(takeUntil(stop$)).toPromise();
    };
  };
