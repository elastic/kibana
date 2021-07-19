/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import apm from 'elastic-apm-node';
import * as Rx from 'rxjs';
import { catchError, finalize, map, mergeMap, takeUntil } from 'rxjs/operators';
import { PNG_JOB_TYPE_V2, getRedirectAppPathHome } from '../../../common/constants';
import { TaskRunResult } from '../../lib/tasks';
import { RunTaskFn, RunTaskFnFactory } from '../../types';
import {
  decryptJobHeaders,
  getConditionalHeaders,
  omitBlockedHeaders,
  generatePngObservableFactory,
} from '../common';
import { getFullUrls } from '../common/v2/get_full_urls';
import { TaskPayloadPNGV2 } from './types';

export const runTaskFnFactory: RunTaskFnFactory<
  RunTaskFn<TaskPayloadPNGV2>
> = function executeJobFactoryFn(reporting, parentLogger) {
  const config = reporting.getConfig();
  const encryptionKey = config.get('encryptionKey');

  return async function runTask(jobId, job, cancellationToken) {
    const apmTrans = apm.startTransaction('reporting execute_job pngV2', 'reporting');
    const apmGetAssets = apmTrans?.startSpan('get_assets', 'setup');
    let apmGeneratePng: { end: () => void } | null | undefined;

    const generatePngObservable = await generatePngObservableFactory(reporting);
    const jobLogger = parentLogger.clone([PNG_JOB_TYPE_V2, 'execute', jobId]);
    const process$: Rx.Observable<TaskRunResult> = Rx.of(1).pipe(
      mergeMap(() => decryptJobHeaders(encryptionKey, job.headers, jobLogger)),
      map((decryptedHeaders) => omitBlockedHeaders(decryptedHeaders)),
      map((filteredHeaders) => getConditionalHeaders(config, filteredHeaders)),
      mergeMap((conditionalHeaders) => {
        const relativeUrl = getRedirectAppPathHome();
        const [url] = getFullUrls(config, [relativeUrl]);
        const [locatorParams] = job.locatorParams;

        if (apmGetAssets) apmGetAssets.end();

        apmGeneratePng = apmTrans?.startSpan('generate_png_pipeline', 'execute');
        return generatePngObservable(
          jobLogger,
          [url, locatorParams],
          job.browserTimezone,
          conditionalHeaders,
          job.layout
        );
      }),
      map(({ base64, warnings }) => ({
        content_type: 'image/png',
        content: base64,
        size: (base64 && base64.length) || 0,
        warnings,
      })),
      catchError((err) => {
        jobLogger.error(err);
        return Rx.throwError(err);
      }),
      finalize(() => apmGeneratePng?.end())
    );

    const stop$ = Rx.fromEventPattern(cancellationToken.on);
    return process$.pipe(takeUntil(stop$)).toPromise();
  };
};
