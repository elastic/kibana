/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import apm from 'elastic-apm-node';
import * as Rx from 'rxjs';
import { finalize, map, mergeMap, takeUntil, tap } from 'rxjs/operators';
import { PNG_JOB_TYPE, REPORTING_TRANSACTION_TYPE } from '../../../../common/constants';
import { TaskRunResult } from '../../../lib/tasks';
import { RunTaskFn, RunTaskFnFactory } from '../../../types';
import {
  decryptJobHeaders,
  getConditionalHeaders,
  getFullUrls,
  omitBlockedHeaders,
  generatePngObservable,
} from '../../common';
import { TaskPayloadPNG } from '../types';

export const runTaskFnFactory: RunTaskFnFactory<RunTaskFn<TaskPayloadPNG>> =
  function executeJobFactoryFn(reporting, parentLogger) {
    const config = reporting.getConfig();
    const encryptionKey = config.get('encryptionKey');

    return function runTask(jobId, job, cancellationToken, stream) {
      const apmTrans = apm.startTransaction('execute-job-png', REPORTING_TRANSACTION_TYPE);
      const apmGetAssets = apmTrans?.startSpan('get-assets', 'setup');
      let apmGeneratePng: { end: () => void } | null | undefined;

      const jobLogger = parentLogger.clone([PNG_JOB_TYPE, 'execute', jobId]);
      const process$: Rx.Observable<TaskRunResult> = Rx.of(1).pipe(
        mergeMap(() => decryptJobHeaders(encryptionKey, job.headers, jobLogger)),
        map((decryptedHeaders) => omitBlockedHeaders(decryptedHeaders)),
        map((filteredHeaders) => getConditionalHeaders(config, filteredHeaders)),
        mergeMap((conditionalHeaders) => {
          const [url] = getFullUrls(config, job);

          apmGetAssets?.end();
          apmGeneratePng = apmTrans?.startSpan('generate-png-pipeline', 'execute');

          return generatePngObservable(reporting, jobLogger, {
            conditionalHeaders,
            urls: [url],
            browserTimezone: job.browserTimezone,
            layout: job.layout,
          });
        }),
        tap(({ buffer }) => stream.write(buffer)),
        map(({ warnings }) => ({
          content_type: 'image/png',
          warnings,
        })),
        tap({ error: (error) => jobLogger.error(error) }),
        finalize(() => apmGeneratePng?.end())
      );

      const stop$ = Rx.fromEventPattern(cancellationToken.on);
      return process$.pipe(takeUntil(stop$)).toPromise();
    };
  };
