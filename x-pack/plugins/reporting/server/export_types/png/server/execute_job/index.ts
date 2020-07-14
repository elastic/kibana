/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import apm from 'elastic-apm-node';
import * as Rx from 'rxjs';
import { catchError, map, mergeMap, takeUntil } from 'rxjs/operators';
import { PNG_JOB_TYPE } from '../../../../../common/constants';
import { ESQueueWorkerExecuteFn, RunTaskFnFactory, TaskRunResult } from '../../../..//types';
import {
  decryptJobHeaders,
  getConditionalHeaders,
  getFullUrls,
  omitBlacklistedHeaders,
} from '../../../common/execute_job/';
import { ScheduledTaskParamsPNG } from '../../types';
import { generatePngObservableFactory } from '../lib/generate_png';

type QueuedPngExecutorFactory = RunTaskFnFactory<ESQueueWorkerExecuteFn<ScheduledTaskParamsPNG>>;

export const runTaskFnFactory: QueuedPngExecutorFactory = function executeJobFactoryFn(
  reporting,
  parentLogger
) {
  const config = reporting.getConfig();
  const encryptionKey = config.get('encryptionKey');
  const logger = parentLogger.clone([PNG_JOB_TYPE, 'execute']);

  return async function runTask(jobId, job, cancellationToken) {
    const apmTrans = apm.startTransaction('reporting execute_job png', 'reporting');
    const apmGetAssets = apmTrans?.startSpan('get_assets', 'setup');
    let apmGeneratePng: { end: () => void } | null | undefined;

    const generatePngObservable = await generatePngObservableFactory(reporting);
    const jobLogger = logger.clone([jobId]);
    const process$: Rx.Observable<TaskRunResult> = Rx.of(1).pipe(
      mergeMap(() => decryptJobHeaders({ encryptionKey, job, logger })),
      map((decryptedHeaders) => omitBlacklistedHeaders({ job, decryptedHeaders })),
      map((filteredHeaders) => getConditionalHeaders({ config, job, filteredHeaders })),
      mergeMap((conditionalHeaders) => {
        const urls = getFullUrls({ config, job });
        const hashUrl = urls[0];
        if (apmGetAssets) apmGetAssets.end();

        apmGeneratePng = apmTrans?.startSpan('generate_png_pipeline', 'execute');
        return generatePngObservable(
          jobLogger,
          hashUrl,
          job.browserTimezone,
          conditionalHeaders,
          job.layout
        );
      }),
      map(({ base64, warnings }) => {
        if (apmGeneratePng) apmGeneratePng.end();

        return {
          content_type: 'image/png',
          content: base64,
          size: (base64 && base64.length) || 0,

          warnings,
        };
      }),
      catchError((err) => {
        jobLogger.error(err);
        return Rx.throwError(err);
      })
    );

    const stop$ = Rx.fromEventPattern(cancellationToken.on);
    return process$.pipe(takeUntil(stop$)).toPromise();
  };
};
