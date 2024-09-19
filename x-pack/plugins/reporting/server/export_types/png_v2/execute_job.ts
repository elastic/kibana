/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import apm from 'elastic-apm-node';
import * as Rx from 'rxjs';
import { catchError, finalize, map, mergeMap, takeUntil, tap } from 'rxjs/operators';
import { PNG_JOB_TYPE_V2 } from '../../../common/constants';
import { TaskRunResult } from '../../lib/tasks';
import { RunTaskFn, RunTaskFnFactory } from '../../types';
import {
  decryptJobHeaders,
  getConditionalHeaders,
  omitBlockedHeaders,
  generatePngObservableFactory,
  setForceNow,
} from '../common';
import { getFullRedirectAppUrl } from '../common/v2/get_full_redirect_app_url';
import { TaskPayloadPNGV2 } from './types';

export const runTaskFnFactory: RunTaskFnFactory<RunTaskFn<TaskPayloadPNGV2>> =
  function executeJobFactoryFn(reporting, parentLogger) {
    const config = reporting.getConfig();
    const encryptionKey = config.get('encryptionKey');

    return async function runTask(jobId, job, cancellationToken, stream) {
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
          const url = getFullRedirectAppUrl(config, job.spaceId);
          const [locatorParams] = job.locatorParams.map(setForceNow(job.forceNow));

          apmGetAssets?.end();

          apmGeneratePng = apmTrans?.startSpan('generate_png_pipeline', 'execute');
          return generatePngObservable(
            jobLogger,
            [url, locatorParams],
            job.browserTimezone,
            conditionalHeaders,
            job.layout
          );
        }),
        tap(({ buffer }) => stream.write(buffer)),
        map(({ warnings }) => ({
          content_type: 'image/png',
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
