/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import querystring from 'querystring';
import { getRouteConfigFactoryReportingPre } from './lib/route_config_factories';
import { API_BASE_URL } from '../../common/constants';

const getStaticFeatureConfig = (getRouteConfig, featureId) => getRouteConfig(() => featureId);
const BASE_GENERATE = `${API_BASE_URL}/generate`;

export function registerLegacy(server, handler, handleError) {
  const getRouteConfig = getRouteConfigFactoryReportingPre(server);

  function createLegacyPdfRoute(server, handler, { path, objectType }) {
    const exportTypeId = 'printablePdf';
    server.route({
      path: path,
      method: 'POST',
      config: getStaticFeatureConfig(getRouteConfig, exportTypeId),
      handler: async (request, h) => {
        const message = `The following URL is deprecated and will stop working in the next major version: ${
          request.url.path
        }`;
        server.log(['warning', 'reporting', 'deprecation'], message);

        try {
          const savedObjectId = request.params.savedId;
          const queryString = querystring.stringify(request.query);

          return await handler(
            exportTypeId,
            {
              objectType,
              savedObjectId,
              queryString,
            },
            request,
            h
          );
        } catch (err) {
          throw handleError(exportTypeId, err);
        }
      },
    });
  }

  createLegacyPdfRoute(server, handler, {
    path: `${BASE_GENERATE}/visualization/{savedId}`,
    objectType: 'visualization',
  });

  createLegacyPdfRoute(server, handler, {
    path: `${BASE_GENERATE}/search/{savedId}`,
    objectType: 'search',
  });

  createLegacyPdfRoute(server, handler, {
    path: `${BASE_GENERATE}/dashboard/{savedId}`,
    objectType: 'dashboard',
  });
}
