/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import url from 'url';
import cookie from 'cookie';
import { getAbsoluteUrlFactory } from './get_absolute_url';
import { cryptoFactory } from '../../../../server/lib/crypto';

export function compatibilityShimFactory(server) {
  const getAbsoluteUrl = getAbsoluteUrlFactory(server);
  const crypto = cryptoFactory(server);

  const decryptJobHeaders = async (job) => {
    try {
      const decryptedHeaders = await crypto.decrypt(job.headers);
      return decryptedHeaders;
    } catch (err) {
      throw new Error('Failed to decrypt report job data. Please re-generate this report.');
    }
  };

  const getSavedObjectAbsoluteUrl = (savedObj) => {
    if (savedObj.urlHash) {
      return getAbsoluteUrl({ hash: savedObj.urlHash });
    }

    if (savedObj.relativeUrl) {
      const { pathname: path, hash, search } = url.parse(savedObj.relativeUrl);
      return getAbsoluteUrl({ path, hash, search });
    }

    if (savedObj.url.startsWith(getAbsoluteUrl())) {
      return savedObj.url;
    }

    throw new Error(`Unable to generate report for url ${savedObj.url}, it's not a Kibana URL`);
  };

  const getSerializedSession = async (decryptedHeaders, jobSession) => {
    if (!server.plugins.security) {
      return null;
    }

    if (jobSession) {
      try {
        return await crypto.decrypt(jobSession);
      } catch (err) {
        throw new Error('Failed to decrypt report job data. Please re-generate this report.');
      }
    }

    const cookies = decryptedHeaders.cookie ? cookie.parse(decryptedHeaders.cookie) : null;
    if (cookies === null) {
      return null;
    }

    const cookieName = server.plugins.security.getSessionCookieOptions().name;
    if (!cookieName) {
      throw new Error('Unable to determine the session cookie name');
    }

    return cookies[cookieName];
  };

  return function (executeJob) {
    return async function (job, cancellationToken) {
      const urls = job.objects.map(getSavedObjectAbsoluteUrl);
      const decryptedHeaders = await decryptJobHeaders(job);
      const authorizationHeader = decryptedHeaders.authorization;
      const serializedSession = await getSerializedSession(decryptedHeaders, job.session);

      return await executeJob({
        title: job.title,
        browserTimezone: job.browserTimezone,
        layout: job.layout,
        basePath: job.basePath,
        forceNow: job.forceNow,
        urls,
        authorizationHeader,
        serializedSession,
      }, cancellationToken);
    };
  };
}
