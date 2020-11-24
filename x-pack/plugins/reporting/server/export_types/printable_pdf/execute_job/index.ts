/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import apm from 'elastic-apm-node';
import * as Rx from 'rxjs';
import { catchError, map, mergeMap, takeUntil } from 'rxjs/operators';
import { PDF_JOB_TYPE } from '../../../../common/constants';
import { TaskRunResult } from '../../../lib/tasks';
import { RunTaskFn, RunTaskFnFactory } from '../../../types';
import {
  decryptJobHeaders,
  getConditionalHeaders,
  getFullUrls,
  omitBlockedHeaders,
} from '../../common';
import { generatePdfObservableFactory } from '../lib/generate_pdf';
import { getCustomLogo } from '../lib/get_custom_logo';
import { TaskPayloadPDF } from '../types';

export const runTaskFnFactory: RunTaskFnFactory<
  RunTaskFn<TaskPayloadPDF>
> = function executeJobFactoryFn(reporting, parentLogger) {
  const config = reporting.getConfig();
  const encryptionKey = config.get('encryptionKey');

  return async function runTask(jobId, job, cancellationToken) {
    const logger = parentLogger.clone([PDF_JOB_TYPE, 'execute-job', jobId]);
    const apmTrans = apm.startTransaction('reporting execute_job pdf', 'reporting');
    const apmGetAssets = apmTrans?.startSpan('get_assets', 'setup');
    let apmGeneratePdf: { end: () => void } | null | undefined;

    const generatePdfObservable = await generatePdfObservableFactory(reporting);

    const jobLogger = logger.clone([jobId]);
    const process$: Rx.Observable<TaskRunResult> = Rx.of(1).pipe(
      mergeMap(() => decryptJobHeaders(encryptionKey, job.headers, logger)),
      map((decryptedHeaders) => omitBlockedHeaders(decryptedHeaders)),
      map((filteredHeaders) => getConditionalHeaders(config, filteredHeaders)),
      mergeMap((conditionalHeaders) =>
        getCustomLogo(reporting, conditionalHeaders, job.spaceId, logger)
      ),
      mergeMap(({ logo, conditionalHeaders }) => {
        const urls = getFullUrls(config, job);

        const { browserTimezone, layout, title } = job;
        if (apmGetAssets) apmGetAssets.end();

        apmGeneratePdf = apmTrans?.startSpan('generate_pdf_pipeline', 'execute');
        return generatePdfObservable(
          jobLogger,
          title,
          urls,
          browserTimezone,
          conditionalHeaders,
          layout,
          logo
        );
      }),
      map(({ buffer, warnings }) => {
        if (apmGeneratePdf) apmGeneratePdf.end();

        const apmEncode = apmTrans?.startSpan('encode_pdf', 'output');
        const content = buffer?.toString('base64') || null;
        if (apmEncode) apmEncode.end();

        return {
          content_type: 'application/pdf',
          content,
          size: buffer?.byteLength || 0,
          warnings,
        };
      }),
      catchError((err) => {
        jobLogger.error(err);
        return Rx.throwError(err);
      })
    );

    const stop$ = Rx.fromEventPattern(cancellationToken.on);

    if (apmTrans) apmTrans.end();
    return process$.pipe(takeUntil(stop$)).toPromise();
  };
};
