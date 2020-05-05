/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { setCollectionInterval } from '../../../../../lib/elasticsearch_settings';
import { handleSettingsError } from '../../../../../lib/errors';

/*
 * Cluster Settings Check Route
 */
export function setCollectionIntervalRoute(server) {
  server.route({
    method: 'PUT',
    path: '/api/monitoring/v1/elasticsearch_settings/set/collection_interval',
    config: {
      validate: {},
    },
    async handler(req) {
      try {
        const response = await setCollectionInterval(req);
        return response;
      } catch (err) {
        throw handleSettingsError(err);
      }
    },
  });
}
