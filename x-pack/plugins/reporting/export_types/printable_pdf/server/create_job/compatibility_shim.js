/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { uriEncode } from '../lib/uri_encode';

export function compatibilityShimFactory(server) {

  const logDeprecation = (msg) => {
    server.log(['warning', 'reporting', 'deprecation'], msg + ' This functionality will be removed with the next major version.');
  };

  const getSavedObjectTitle = async (objectType, savedObjectId, savedObjectsClient) => {
    if (!objectType) {
      throw new Error('objectType is required to determine the title from the saved object');
    }

    if (!savedObjectId) {
      throw new Error('savedObjectId is required to determine the title from the saved object');
    }

    logDeprecation('The title should be provided with the job generation request. Please use Kibana to regenerate your URLs.');
    const savedObject = await savedObjectsClient.get(objectType, savedObjectId);

    return savedObject.attributes.title;
  };


  const getSavedObjectRelativeUrl = (objectType, savedObjectId, queryString) => {
    if (!objectType) {
      throw new Error('objectType is required to determine the savedObject urlHash');
    }

    if (!savedObjectId) {
      throw new Error('id is required to determine the savedObject relativeUrl');
    }

    logDeprecation('The relativeUrl should be provided with the job generation request. Please use Kibana to regenerate your URLs.');
    const appPrefixes = {
      dashboard: '/dashboard/',
      visualization: '/visualize/edit/',
      search: '/discover/'
    };

    const appPrefix = appPrefixes[objectType];
    if (!appPrefix) throw new Error('Unexpected app type: ' + objectType);

    const hash = appPrefix + uriEncode.string(savedObjectId, true);

    return `/app/kibana#${hash}?${queryString || ''}`;
  };

  return function compatibilityShimFactory(createJob) {
    return async function ({
      objectType,
      savedObjectId,
      title,
      relativeUrls,
      queryString,
      browserTimezone,
      layout
    }, headers, serializedSession, request) {

      if (objectType && savedObjectId && relativeUrls) {
        throw new Error('objectType and savedObjectId should not be provided in addition to the relativeUrls');
      }

      const transformedJobParams = {
        objectType,
        title: title || await getSavedObjectTitle(objectType, savedObjectId, request.getSavedObjectsClient()),
        relativeUrls: objectType && savedObjectId ? [ getSavedObjectRelativeUrl(objectType, savedObjectId, queryString) ] : relativeUrls,
        browserTimezone,
        layout
      };

      return await createJob(transformedJobParams, headers, serializedSession, request);
    };
  };
}
