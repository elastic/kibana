/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TaskRunResult } from '@kbn/reporting-common';
import apm from 'elastic-apm-node';
import * as Rx from 'rxjs';
import { finalize, map, mergeMap, takeUntil, tap } from 'rxjs/operators';
import { REPORTING_TRANSACTION_TYPE } from '../../../common/constants';
import { RunTaskFn, RunTaskFnFactory } from '../../types';
import { decryptJobHeaders, generatePngObservable } from '../common';
import { getFullRedirectAppUrl } from '../common/v2/get_full_redirect_app_url';
import { TaskPayloadPNGV2 } from './types';

export const runTaskFnFactory: RunTaskFnFactory<RunTaskFn<TaskPayloadPNGV2>> =
  function executeJobFactoryFn(reporting, parentLogger) {
    const { encryptionKey } = reporting.getConfig();

    return function runTask(jobId, job, cancellationToken, stream) {
      const apmTrans = apm.startTransaction('execute-job-png-v2', REPORTING_TRANSACTION_TYPE);
      const apmGetAssets = apmTrans?.startSpan('get-assets', 'setup');
      let apmGeneratePng: { end: () => void } | null | undefined;

      const jobLogger = parentLogger.get(`execute:${jobId}`);
      const process$: Rx.Observable<TaskRunResult> = Rx.of(1).pipe(
        mergeMap(() => decryptJobHeaders(encryptionKey, job.headers, jobLogger)),
        mergeMap((headers) => {
          const url = getFullRedirectAppUrl(
            reporting.getConfig(),
            reporting.getServerInfo(),
            job.spaceId,
            job.forceNow
          );
          const [locatorParams] = job.locatorParams;

          apmGetAssets?.end();
          apmGeneratePng = apmTrans?.startSpan('generate-png-pipeline', 'execute');

          const screenshotFn = () =>
            reporting.getScreenshots({
              headers,
              browserTimezone: job.browserTimezone,
              layout: { ...job.layout, id: 'preserve_layout' },
              urls: [[url, locatorParams]],
            });

          return generatePngObservable(screenshotFn, jobLogger, {
            headers,
            browserTimezone: job.browserTimezone,
            layout: { ...job.layout, id: 'preserve_layout' },
            urls: [[url, locatorParams]],
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
