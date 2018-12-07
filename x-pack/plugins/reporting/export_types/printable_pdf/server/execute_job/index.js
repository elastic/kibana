/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as Rx from 'rxjs';
import { mergeMap, catchError, map, takeUntil } from 'rxjs/operators';
import { i18n } from '@kbn/i18n';
import { oncePerServer } from '../../../../server/lib/once_per_server';
import { generatePdfObservableFactory } from '../lib/generate_pdf';
import { compatibilityShimFactory } from './compatibility_shim';
import { decryptJobHeaders, omitBlacklistedHeaders, getConditionalHeaders,
  addForceNowQuerystring, getCustomLogo } from '../../../common/execute_job/';


function executeJobFn(server) {
  const generatePdfObservable = generatePdfObservableFactory(server);
  const compatibilityShim = compatibilityShimFactory(server);

  return compatibilityShim(function executeJob(jobToExecute, cancellationToken) {
    const process$ = Rx.of({ job: jobToExecute, server }).pipe(
      mergeMap(decryptJobHeaders),
      catchError(() => Rx.throwError(
        i18n.translate('xpack.reporting.exportTypes.printablePdf.compShim.failedToDecryptReportJobDataErrorMessage', {
          defaultMessage: 'Failed to decrypt report job data. Please re-generate this report.'
        }))),
      map(omitBlacklistedHeaders),
      map(getConditionalHeaders),
      mergeMap(getCustomLogo),
      mergeMap(addForceNowQuerystring),
      mergeMap(({ job, conditionalHeaders, logo, urls }) => {
        return generatePdfObservable(job.title, urls, job.browserTimezone, conditionalHeaders, job.layout, logo);
      }),
      map(buffer => ({
        content_type: 'application/pdf',
        content: buffer.toString('base64'),
        size: buffer.byteLength,
      }))
    );

    const stop$ = Rx.fromEventPattern(cancellationToken.on);

    return process$.pipe(
      takeUntil(stop$)
    ).toPromise();
  });
}

export const executeJobFactory = oncePerServer(executeJobFn);
