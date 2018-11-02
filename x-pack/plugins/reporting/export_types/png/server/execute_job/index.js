/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import url from 'url';
import * as Rx from 'rxjs';
import { mergeMap, catchError, map, takeUntil } from 'rxjs/operators';
import { oncePerServer } from '../../../../server/lib/once_per_server';
import { generatePngObservableFactory } from '../lib/generate_png';
import { cryptoFactory } from '../../../../server/lib/crypto';
import { getAbsoluteUrlFactory } from '../../../common/execute_job/get_absolute_url';
import { omit } from 'lodash';

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
  const getAbsoluteUrl = getAbsoluteUrlFactory(server);
  const config = server.config();

  const decryptJobHeaders = async (job) => {
    const decryptedHeaders = await crypto.decrypt(job.headers);
    return { job, decryptedHeaders };
  };

  const omitBlacklistedHeaders = ({ job, decryptedHeaders }) => {
    const filteredHeaders = omit(decryptedHeaders, KBN_SCREENSHOT_HEADER_BLACKLIST);
    return { job, filteredHeaders };
  };

  const getSavedObjectAbsoluteUrl = (job, relativeUrl) => {
    if (relativeUrl) {
      const { pathname: path, hash, search } = url.parse(relativeUrl);
      return getAbsoluteUrl({ basePath: job.basePath, path, hash, search });
    }

    throw new Error(`Unable to generate report. Url is not defined.`);
  };

  const getConditionalHeaders = ({ job, filteredHeaders }) => {
    const conditionalHeaders = {
      headers: filteredHeaders,
      conditions: {
        hostname: config.get('xpack.reporting.kibanaServer.hostname') || config.get('server.host'),
        port: config.get('xpack.reporting.kibanaServer.port') || config.get('server.port'),
        basePath: config.get('server.basePath'),
        protocol: config.get('xpack.reporting.kibanaServer.protocol') || server.info.protocol,
      }
    };

    return { job, conditionalHeaders };
  };

  const addForceNowQuerystring = async ({ job, conditionalHeaders }) => {

    const jobUrl = getSavedObjectAbsoluteUrl(job, job.relativeUrl);

    if (!job.forceNow) {
      return { job, conditionalHeaders, hashUrl: jobUrl };
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

    const hashUrl = url.format({
      ...parsed,
      hash: transformedHash
    });

    return { job, conditionalHeaders, hashUrl };
  };

  return function executeJob(jobToExecute, cancellationToken) {
    const process$ = Rx.of(jobToExecute).pipe(
      mergeMap(decryptJobHeaders),
      catchError(() => Rx.throwError('Failed to decrypt report job data. Please re-generate this report.')),
      map(omitBlacklistedHeaders),
      map(getConditionalHeaders),
      mergeMap(addForceNowQuerystring),
      mergeMap(({ job, conditionalHeaders, hashUrl }) => {
        return generatePngObservable(hashUrl, job.browserTimezone, conditionalHeaders, job.layout);
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
  };
}

export const executeJobFactory = oncePerServer(executeJobFn);
