/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import url from 'url';
import * as Rx from 'rxjs';
import { mergeMap, catchError, map, takeUntil } from 'rxjs/operators';
import { omit } from 'lodash';
import { oncePerServer } from '../../../../server/lib/once_per_server';
import { generatePngObservableFactory } from '../lib/generate_png';
import { cryptoFactory } from '../../../../server/lib/crypto';
import { compatibilityShimFactory } from './compatibility_shim';

const KBN_SCREENSHOT_HEADER_BLACKLIST = [
  'accept-encoding',
  'content-length',
  'content-type',
  'host',
  'referer',
  // `Transfer-Encoding` is hop-by-hop header that is meaningful
  // only for a single transport-level connection, and shouldn't
  // be stored by caches or forwarded by proxies.
  'transfer-encoding',
];

function executeJobFn(server) {
  const generatePngObservable = generatePngObservableFactory(server);
  const crypto = cryptoFactory(server);
  const compatibilityShim = compatibilityShimFactory(server);

  const decryptJobHeaders = async (job) => {
    const decryptedHeaders = await crypto.decrypt(job.headers);
    return { job, decryptedHeaders };
  };

  const omitBlacklistedHeaders = ({ job, decryptedHeaders }) => {
    const filteredHeaders = omit(decryptedHeaders, KBN_SCREENSHOT_HEADER_BLACKLIST);
    return { job, filteredHeaders };
  };

  const addForceNowQuerystring = async ({ job, filteredHeaders, logo }) => {
    const urls = job.urls.map(jobUrl => {
      if (!job.forceNow) {
        return jobUrl;
      }

      const parsed = url.parse(jobUrl, true);
      const hash = url.parse(parsed.hash.replace(/^#/, ''), true);
      const transformedHash = url.format({
        pathname: hash.pathname,
        query: {
          ...hash.query,
          forceNow: job.forceNow
        }
      });

      return url.format({
        ...parsed,
        hash: transformedHash
      });
    });
    return { job, filteredHeaders, logo, urls };
  };

  return compatibilityShim(function executeJob(jobToExecute, cancellationToken) {
    const process$ = Rx.of(jobToExecute).pipe(
      mergeMap(decryptJobHeaders),
      catchError(() => Rx.throwError('Failed to decrypt report job data. Please re-generate this report.')),
      map(omitBlacklistedHeaders),
      mergeMap(addForceNowQuerystring),
      mergeMap(({ job, filteredHeaders, urls }) => {
        return generatePngObservable(urls, filteredHeaders, job.layout);
      }),
      map(buffer => ({
        content_type: 'image/png',
        content: buffer.toString('base64')
      }))
    );

    const stop$ = Rx.fromEventPattern(cancellationToken.on);

    return process$.pipe(
      takeUntil(stop$)
    ).toPromise();
  });
}

export const executeJobFactory = oncePerServer(executeJobFn);
