/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { postDisableInternalCollectionRequestParamsRT } from '../../../../../common/http_api/setup';
import { createValidationFunction } from '../../../../lib/create_route_validation_function';
import { verifyMonitoringAuth } from '../../../../lib/elasticsearch/verify_monitoring_auth';
import { setCollectionDisabled } from '../../../../lib/elasticsearch_settings/set/collection_disabled';
import { handleError } from '../../../../lib/errors';
import { MonitoringCore } from '../../../../types';

export function disableElasticsearchInternalCollectionRoute(server: MonitoringCore) {
  server.route({
    method: 'post',
    path: '/api/monitoring/v1/setup/collection/{clusterUuid}/disable_internal_collection',
    validate: {
      params: createValidationFunction(postDisableInternalCollectionRequestParamsRT),
    },
    handler: async (req) => {
      // NOTE using try/catch because checkMonitoringAuth is expected to throw
      // an error when current logged-in user doesn't have permission to read
      // the monitoring data. `try/catch` makes it a little more explicit.
      try {
        await verifyMonitoringAuth(req);
        await setCollectionDisabled(req);
      } catch (err) {
        throw handleError(err, req);
      }
      return null;
    },
  });
}
