/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import url from 'url';
import { getAbsoluteUrlFactory } from './get_absolute_url';

export function compatibilityShimFactory(server) {
  const getAbsoluteUrl = getAbsoluteUrlFactory(server);

  const getSavedObjectAbsoluteUrl = (job, savedObject) => {
    if (savedObject.urlHash) {
      return getAbsoluteUrl({ hash: savedObject.urlHash });
    }

    if (savedObject.relativeUrl) {
      const { pathname: path, hash, search } = url.parse(savedObject.relativeUrl);
      return getAbsoluteUrl({ basePath: job.basePath, path, hash, search });
    }

    if (savedObject.url.startsWith(getAbsoluteUrl())) {
      return savedObject.url;
    }

    throw new Error(`Unable to generate report for url ${savedObject.url}, it's not a Kibana URL`);
  };

  return function (executeJob) {
    return async function (job, cancellationToken) {
      const urls = job.objects.map(savedObject => getSavedObjectAbsoluteUrl(job, savedObject));

      return await executeJob({ ...job, urls }, cancellationToken);
    };
  };
}
