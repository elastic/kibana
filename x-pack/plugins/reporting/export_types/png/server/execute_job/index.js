/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import url from 'url';
import cookie from 'cookie';
import * as Rx from 'rxjs';
import { mergeMap, catchError, map, takeUntil } from 'rxjs/operators';
import { oncePerServer } from '../../../../server/lib/once_per_server';
import { generatePngObservableFactory } from '../lib/generate_png';
import { cryptoFactory } from '../../../../server/lib/crypto';
import { getAbsoluteUrlFactory } from '../../../common/execute_job/get_absolute_url';

function executeJobFn(server) {
  const generatePngObservable = generatePngObservableFactory(server);
  const crypto = cryptoFactory(server);
  const getAbsoluteUrl = getAbsoluteUrlFactory(server);
  const config = server.config();

  const decryptJobHeaders = async (job) => {
    const decryptedHeaders = await crypto.decrypt(job.headers);
    return { job, decryptedHeaders };
  };

  const getSavedObjectAbsoluteUrl = (job, relativeUrl) => {

    if (relativeUrl) {
      const { pathname: path, hash, search } = url.parse(relativeUrl);
      return getAbsoluteUrl({ basePath: job.basePath, path, hash, search });
    }

    throw new Error(`Unable to generate report. Url is not defined.`);
  };

  const getSerializedSession = async ({ job, decryptedHeaders }) => {
    if (!server.plugins.security) {
      job.serializedSession =  null;
      return { decryptedHeaders, job };
    }

    if (job.session) {
      try {
        job.serializedSession =  await crypto.decrypt(job.session);
        return { decryptedHeaders, job };
      } catch (err) {
        throw new Error('Failed to decrypt report job data. Please re-generate this report.');
      }
    }

    const cookies = decryptedHeaders.cookie ? cookie.parse(decryptedHeaders.cookie) : null;
    if (cookies === null) {
      job.serializedSession =  null;
      return { decryptedHeaders, job };
    }

    const cookieName = server.plugins.security.getSessionCookieOptions().name;
    if (!cookieName) {
      throw new Error('Unable to determine the session cookie name');
    }

    job.serializedSession = cookies[cookieName];

    return { decryptedHeaders, job };
  };

  const getSessionCookie = async ({ job, logo }) => {
    if (!job.serializedSession) {
      return { job, logo, sessionCookie: null };
    }

    const cookieOptions = await server.plugins.security.getSessionCookieOptions();
    const { httpOnly, name, path, secure } = cookieOptions;

    return { job, logo, sessionCookie: {
      domain: config.get('xpack.reporting.kibanaServer.hostname') || config.get('server.host'),
      httpOnly,
      name,
      path,
      sameSite: 'Strict',
      secure,
      value: job.serializedSession,
    } };
  };

  const addForceNowQuerystring = async ({ job, sessionCookie }) => {

    const jobUrl = getSavedObjectAbsoluteUrl(job, job.relativeUrl);

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

    const hashUrl = url.format({
      ...parsed,
      hash: transformedHash
    });
    //});
    return { job, sessionCookie, hashUrl };
  };

  return function executeJob(jobToExecute, cancellationToken) {
    const process$ = Rx.of(jobToExecute).pipe(
      mergeMap(decryptJobHeaders),
      catchError(() => Rx.throwError('Failed to decrypt report job data. Please re-generate this report.')),
      mergeMap(getSerializedSession),
      mergeMap(getSessionCookie),
      mergeMap(addForceNowQuerystring),
      mergeMap(({ job, sessionCookie, hashUrl }) => {
        return generatePngObservable(hashUrl, job.browserTimezone, sessionCookie, job.layout);
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
