/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { API_ROUTE_KIBANA } from '../../common/lib/constants';
import { formatResponseProvider } from '../lib/format_response_provider';

export function kibana(server) {
  const formatResponse = formatResponseProvider(server);
  const routePrefix = API_ROUTE_KIBANA;
  const VISUALIZATION_TYPE = 'visualization';

  // get saved visualizations
  server.route({
    method: 'GET',
    path: `${routePrefix}/savedVisualizations`,
    handler: function(req, reply) {
      const savedObjectsClient = req.getSavedObjectsClient();
      const { name, page, perPage } = req.query;

      return savedObjectsClient
        .find({
          type: VISUALIZATION_TYPE,
          search: name ? `${name}* | ${name}` : '*',
          perPage: perPage || 10000,
          page: page || 1,
          searchFields: ['title^3', 'description'],
          fields: ['title', 'description'],
        })
        .then(resp => {
          return {
            total: resp.total,
            visualizations: resp.saved_objects.map(savedObject => ({
              id: savedObject.id,
              ...savedObject.attributes,
            })),
          };
        })
        .then(formatResponse(reply))
        .catch(formatResponse(reply));
    },
  });
}
