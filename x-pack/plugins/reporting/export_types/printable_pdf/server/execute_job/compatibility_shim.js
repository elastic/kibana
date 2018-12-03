/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import url from 'url';
import { getAbsoluteUrlFactory } from '../../../common/execute_job/get_absolute_url';
import { i18n } from '@kbn/i18n';

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

    throw new Error(i18n.translate('xpack.reporting.exportTypes.printablePdf.compShim.unableToGenerateReportErrorMessage', {
      defaultMessage: `Unable to generate report for url {savedObjUrl}, it's not a Kibana URL`,
      values: { savedObjUrl: savedObject.url }
    }));
  };

  return function (executeJob) {
    return async function (job, cancellationToken) {
      const urls = job.objects.map(savedObject => getSavedObjectAbsoluteUrl(job, savedObject));

      return await executeJob({ ...job, urls }, cancellationToken);
    };
  };
}
