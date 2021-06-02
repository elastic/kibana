/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import apm from 'elastic-apm-node';
import * as Rx from 'rxjs';
import { catchError, map, mergeMap, takeUntil } from 'rxjs/operators';
import { PDF_JOB_TYPE_V2 } from '../../../../common/constants';
import { TaskRunResult } from '../../../lib/tasks';
import { RunTaskFn, RunTaskFnFactory } from '../../../types';
import {
  decryptJobHeaders,
  getConditionalHeaders,
  omitBlockedHeaders,
  getFullUrls,
} from '../../common';
import { generatePdfObservableFactory } from './lib/generate_pdf';
import { getCustomLogo } from '../lib/get_custom_logo';
import { TaskPayloadPDFV2 } from './types';

export const runTaskFnFactory: RunTaskFnFactory<
  RunTaskFn<TaskPayloadPDFV2>
> = function executeJobFactoryFn(reporting, parentLogger) {
  const config = reporting.getConfig();
  const encryptionKey = config.get('encryptionKey');

  return async function runTask(jobId, job, cancellationToken) {
    const jobLogger = parentLogger.clone([PDF_JOB_TYPE_V2, 'execute-job', jobId]);
    const apmTrans = apm.startTransaction('reporting execute_job pdf_v2', 'reporting');
    const apmGetAssets = apmTrans?.startSpan('get_assets', 'setup');
    let apmGeneratePdf: { end: () => void } | null | undefined;

    const generatePdfObservable = await generatePdfObservableFactory(reporting);

    const process$: Rx.Observable<TaskRunResult> = Rx.of(1).pipe(
      mergeMap(() => decryptJobHeaders(encryptionKey, job.headers, jobLogger)),
      map((decryptedHeaders) => omitBlockedHeaders(decryptedHeaders)),
      map((filteredHeaders) => getConditionalHeaders(config, filteredHeaders)),
      mergeMap((conditionalHeaders) =>
        getCustomLogo(reporting, conditionalHeaders, job.spaceId, jobLogger)
      ),
      mergeMap(({ logo, conditionalHeaders }) => {
        const { browserTimezone, layout, title, locators } = job;
        if (apmGetAssets) apmGetAssets.end();

        // TODO: HACK, temporary hack before we have URL locators and an app client side to handle redirects
        const urls = getFullUrls(config, {
          ...job,
          relativeUrls: locators.map((l) => l.id),
        });

        apmGeneratePdf = apmTrans?.startSpan('generate_pdf_pipeline', 'execute');
        return generatePdfObservable(
          jobLogger,
          title,
          // TODO: HACK, temporary hack before we have URL locators and an app client side to handle redirects
          urls.map((url, idx) => ({ ...locators[idx], id: url })),
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
