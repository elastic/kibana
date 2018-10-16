/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import url from 'url';
import { omit } from 'lodash';
import { oncePerServer } from '../../../../server/lib/once_per_server';
import { generatePngPromiseFactory } from '../lib/generate_png';
import { cryptoFactory } from '../../../../server/lib/crypto';
import { getAbsoluteUrlFactory } from '../../../common/execute_job/get_absolute_url';

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
  const generatePngPromise = generatePngPromiseFactory(server);
  const crypto = cryptoFactory(server);
  const getAbsoluteUrl = getAbsoluteUrlFactory(server);

  const decryptJobHeaders = async (job) => {
    const decryptedHeaders = await crypto.decrypt(job.headers);
    return decryptedHeaders;
  };

  const omitBlacklistedHeaders = (decryptedHeaders) => {
    const filteredHeaders = omit(decryptedHeaders, KBN_SCREENSHOT_HEADER_BLACKLIST);
    return filteredHeaders;
  };

  const getSavedObjectAbsoluteUrl = (job, relativeUrl) => {

    if (relativeUrl) {
      const { pathname: path, hash, search } = url.parse(relativeUrl);
      return getAbsoluteUrl({ basePath: job.basePath, path, hash, search });
    }

    throw new Error(`Unable to generate report. Url is not defined.`);
  };

  const addForceNowQuerystring = (job) => {

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

    return hashUrl;
  };

  return async function executeJob(jobToExecute) {

    let decryptedHeaders;
    try {
      decryptedHeaders = await decryptJobHeaders(jobToExecute);
    } catch (e) {
      throw new Error(
        'Failed to decrypt report job data. Please ensure that xpack.reporting.encryptionKey is set and re-generate this report.'
      );
    }

    const filteredHeaders = omitBlacklistedHeaders(decryptedHeaders);

    const url = addForceNowQuerystring(jobToExecute);

    const pngPromise =  generatePngPromise(url, filteredHeaders, jobToExecute.layout);

    return pngPromise;
  };
}

export const executeJobFactory = oncePerServer(executeJobFn);
