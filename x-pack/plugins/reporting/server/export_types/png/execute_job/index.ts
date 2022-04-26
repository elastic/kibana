/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import apm from 'elastic-apm-node';
import * as Rx from 'rxjs';
import { finalize, map, mergeMap, takeUntil, tap } from 'rxjs/operators';
import { REPORTING_TRANSACTION_TYPE } from '../../../../common/constants';
import { TaskRunResult } from '../../../lib/tasks';
import { PngScreenshotOptions, RunTaskFn, RunTaskFnFactory } from '../../../types';
import { decryptJobHeaders, getFullUrls, generatePngObservable } from '../../common';
import { TaskPayloadPNG } from '../types';

export const runTaskFnFactory: RunTaskFnFactory<RunTaskFn<TaskPayloadPNG>> =
  function executeJobFactoryFn(reporting, parentLogger) {
    const config = reporting.getConfig();
    const encryptionKey = config.get('encryptionKey');

    return function runTask(jobId, job, cancellationToken, stream) {
      const apmTrans = apm.startTransaction('execute-job-png', REPORTING_TRANSACTION_TYPE);
      const apmGetAssets = apmTrans?.startSpan('get-assets', 'setup');
      let apmGeneratePng: { end: () => void } | null | undefined;

      const jobLogger = parentLogger.get(`execute:${jobId}`);
      const process$: Rx.Observable<TaskRunResult> = Rx.of(1).pipe(
        mergeMap(() => decryptJobHeaders(encryptionKey, job.headers, jobLogger)),
        mergeMap((headers) => {
          const [url] = getFullUrls(config, job);

          apmGetAssets?.end();
          apmGeneratePng = apmTrans?.startSpan('generate-png-pipeline', 'execute');

          return generatePngObservable(reporting, jobLogger, {
            headers,
            urls: [url],
            browserTimezone: job.browserTimezone,
            layout: {
              ...job.layout,
              // TODO: We do not do a runtime check for supported layout id types for now. But technically
              // we should.
              id: job.layout?.id,
            } as PngScreenshotOptions['layout'],
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
    };
  };
