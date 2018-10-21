/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import url from 'url';
import cookie from 'cookie';
import { cryptoFactory } from '../../../../server/lib/crypto';
import * as Rx from 'rxjs';
import { mergeMap, map, catchError, takeUntil } from 'rxjs/operators';
import { UI_SETTINGS_CUSTOM_PDF_LOGO } from '../../../../common/constants';
import { oncePerServer } from '../../../../server/lib/once_per_server';
import { generatePdfObservableFactory } from '../lib/generate_pdf';
import { compatibilityShimFactory } from './compatibility_shim';

function executeJobFn(server) {
  const generatePdfObservable = generatePdfObservableFactory(server);
  const compatibilityShim = compatibilityShimFactory(server);
  const crypto = cryptoFactory(server);
  const config = server.config();
  const serverBasePath = config.get('server.basePath');

  const decryptJobHeaders = async (job) => {
    const decryptedHeaders = await crypto.decrypt(job.headers);
    job.authorizationHeader = decryptedHeaders.authorization;
    return { job, decryptedHeaders };
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

  const getCustomLogo = async ({ job }) => {
    const fakeRequest = {
      headers: {
        ...job.authorizationHeader && { authorization: job.authorizationHeader },
      },
      // This is used by the spaces SavedObjectClientWrapper to determine the existing space.
      // We use the basePath from the saved job, which we'll have post spaces being implemented;
      // or we use the server base path, which uses the default space
      getBasePath: () => job.basePath || serverBasePath
    };

    const savedObjects = server.savedObjects;
    const savedObjectsClient = savedObjects.getScopedSavedObjectsClient(fakeRequest);
    const uiSettings = server.uiSettingsServiceFactory({
      savedObjectsClient
    });

    const logo = await uiSettings.get(UI_SETTINGS_CUSTOM_PDF_LOGO);

    return { job, logo };
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

  const addForceNowQuerystring = async ({ job, logo, sessionCookie }) => {
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
    return { job, logo, sessionCookie, urls };
  };

  return compatibilityShim(function executeJob(jobToExecute, cancellationToken) {
    const process$ = Rx.of(jobToExecute).pipe(
      mergeMap(decryptJobHeaders),
      catchError(() => Rx.throwError('Failed to decrypt report job data. Please re-generate this report.')),
      mergeMap(getSerializedSession),
      mergeMap(getCustomLogo),
      mergeMap(getSessionCookie),
      mergeMap(addForceNowQuerystring),
      mergeMap(({ job, logo, sessionCookie, urls }) => {
        return generatePdfObservable(job.title, urls, job.browserTimezone, sessionCookie, job.layout, logo);
      }),
      map(buffer => ({
        content_type: 'application/pdf',
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
