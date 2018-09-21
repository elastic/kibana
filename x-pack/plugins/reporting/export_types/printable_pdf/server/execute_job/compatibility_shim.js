/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import url from 'url';
import { getAbsoluteUrlFactory } from './get_absolute_url';
import { i18n } from '@kbn/i18n';

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

    throw new Error(i18n.translate('xpack.reporting.exportTypes.printablePdf.compShim.unableToGenerateErrorMessage', {
      defaultMessage: 'Unable to generate report for url {savedObjUrl}, it\'s not a Kibana URL',
      values: { savedObjUrl: savedObj.url }
    }));
  };

  return function (executeJob) {
    return async function (job, cancellationToken) {
      const urls = job.objects.map(getSavedObjectAbsoluteUrl);

      return await executeJob({ ...job, urls }, cancellationToken);
    };
  };
}