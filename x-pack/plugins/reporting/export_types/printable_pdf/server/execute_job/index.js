/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import url from 'url';
import * as Rx from 'rxjs';
import { mergeMap, catchError, map, takeUntil } from 'rxjs/operators';
import { omit } from 'lodash';
import { UI_SETTINGS_CUSTOM_PDF_LOGO } from '../../../../common/constants';
import { oncePerServer } from '../../../../server/lib/once_per_server';
import { generatePdfObservableFactory } from '../lib/generate_pdf';
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
  const generatePdfObservable = generatePdfObservableFactory(server);
  const crypto = cryptoFactory(server);
  const compatibilityShim = compatibilityShimFactory(server);
  const config = server.config();

  const serverBasePath = server.config().get('server.basePath');

  const decryptJobHeaders = async (job) => {
    const decryptedHeaders = await crypto.decrypt(job.headers);
    return { job, decryptedHeaders };
  };

  const omitBlacklistedHeaders = ({ job, decryptedHeaders }) => {
    const filteredHeaders = omit(decryptedHeaders, KBN_SCREENSHOT_HEADER_BLACKLIST);
    return { job, filteredHeaders };
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

  const getCustomLogo = async ({ job, conditionalHeaders }) => {
    const fakeRequest = {
      headers: conditionalHeaders.headers,
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

    return { job, conditionalHeaders, logo };
  };

  const addForceNowQuerystring = async ({ job, conditionalHeaders, logo }) => {
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
    return { job, conditionalHeaders, logo, urls };
  };

  return compatibilityShim(function executeJob(jobToExecute, cancellationToken) {
    const process$ = Rx.of(jobToExecute).pipe(
      mergeMap(decryptJobHeaders),
      catchError(() => Rx.throwError('Failed to decrypt report job data. Please re-generate this report.')),
      map(omitBlacklistedHeaders),
      map(getConditionalHeaders),
      mergeMap(getCustomLogo),
      mergeMap(addForceNowQuerystring),
      mergeMap(({ job, conditionalHeaders, logo, urls }) => {
        return generatePdfObservable(job.title, urls, job.browserTimezone, conditionalHeaders, job.layout, logo);
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
