/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as Rx from 'rxjs';
import { mergeMap, catchError, map, takeUntil } from 'rxjs/operators';
import { oncePerServer } from '../../../../server/lib/once_per_server';
import { generatePngObservableFactory } from '../lib/generate_png';
import { decryptJobHeaders, omitBlacklistedHeaders, getConditionalHeaders, addForceNowQuerystring } from '../../../common/execute_job/';

function executeJobFn(server) {
  const generatePngObservable = generatePngObservableFactory(server);

  return function executeJob(jobToExecute, cancellationToken) {
    const process$ = Rx.of({ job: jobToExecute, server }).pipe(
      mergeMap(decryptJobHeaders),
      catchError(() => Rx.throwError('Failed to decrypt report job data. Please re-generate this report.')),
      map(omitBlacklistedHeaders),
      map(getConditionalHeaders),
      mergeMap(addForceNowQuerystring),
      mergeMap(({ job, conditionalHeaders, urls }) => {
        const hashUrl = urls[0];
        return generatePngObservable(hashUrl, job.browserTimezone, conditionalHeaders, job.layout);
      }),
      map(buffer => ({
        content_type: 'image/png',
        content: buffer.toString('base64'),
        size: buffer.byteLength,
      }))
    );

    const stop$ = Rx.fromEventPattern(cancellationToken.on);

    return process$.pipe(
      takeUntil(stop$)
    ).toPromise();
  };
}

export const executeJobFactory = oncePerServer(executeJobFn);
