/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getElasticsearchSettingsClusterResponsePayloadRT } from '../../../../../../common/http_api/elasticsearch_settings';
import { checkClusterSettings } from '../../../../../lib/elasticsearch_settings';
import { handleSettingsError } from '../../../../../lib/errors';
import { MonitoringCore } from '../../../../../types';

/*
 * Cluster Settings Check Route
 */
export function clusterSettingsCheckRoute(server: MonitoringCore) {
  server.route({
    method: 'get',
    path: '/api/monitoring/v1/elasticsearch_settings/check/cluster',
    validate: {},
    async handler(req) {
      try {
        const response = await checkClusterSettings(req); // needs to be try/catch to handle privilege error
        return getElasticsearchSettingsClusterResponsePayloadRT.encode(response);
      } catch (err) {
        server.log.error(err);
        throw handleSettingsError(err);
      }
    },
  });
}
