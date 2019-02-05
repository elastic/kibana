/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export function compatibilityShimFactory() {
  return function compatibilityShimFactory(createJob) {
    return async function ({
      objectType,
      title,
      relativeUrls,
      browserTimezone,
      layout
    }, headers, request) {

      if (objectType && relativeUrls) {
        throw new Error('objectType should not be provided in addition to the relativeUrls');
      }

      if (!title) {
        throw new Error(`The 'title' param is required`);
      }

      if (!relativeUrls) {
        throw new Error(`The 'relativeUrls' param is required`);
      }

      const transformedJobParams = {
        objectType,
        title,
        relativeUrls,
        browserTimezone,
        layout
      };

      return await createJob(transformedJobParams, headers, request);
    };
  };
}
