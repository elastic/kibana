/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getKibanaClusterStatus } from './_get_kibana_cluster_status';
import { getKibanas } from '../../../../lib/kibana/get_kibanas';
import { handleError } from '../../../../lib/errors';
import { MonitoringCore } from '../../../../types';
import {
  postKibanaInstancesRequestParamsRT,
  postKibanaInstancesRequestPayloadRT,
  postKibanaInstancesResponsePayloadRT,
} from '../../../../../common/http_api/kibana';
import { createValidationFunction } from '../../../../lib/create_route_validation_function';

export function kibanaInstancesRoute(server: MonitoringCore) {
  const validateParams = createValidationFunction(postKibanaInstancesRequestParamsRT);
  const validateBody = createValidationFunction(postKibanaInstancesRequestPayloadRT);

  server.route({
    method: 'post',
    path: '/api/monitoring/v1/clusters/{clusterUuid}/kibana/instances',
    validate: {
      params: validateParams,
      body: validateBody,
    },
    options: {
      access: 'internal',
    },
    async handler(req) {
      const clusterUuid = req.params.clusterUuid;

      try {
        const [clusterStatus, kibanas] = await Promise.all([
          getKibanaClusterStatus(req, { clusterUuid }),
          getKibanas(req, { clusterUuid }),
        ]);

        return postKibanaInstancesResponsePayloadRT.encode({
          clusterStatus,
          kibanas,
        });
      } catch (err) {
        throw handleError(err, req);
      }
    },
  });
}
