/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import url from 'url';
import { getAbsoluteUrlFactory } from './get_absolute_url';

export function compatibilityShimFactory(server) {
  const getAbsoluteUrl = getAbsoluteUrlFactory(server);

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

  return function (executeJob) {
    return async function (job, cancellationToken) {
      const urls = job.objects.map(getSavedObjectAbsoluteUrl);

      return await executeJob({ ...job, urls }, cancellationToken);
    };
  };
}