/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  postBeatsListingRequestParamsRT,
  postBeatsListingRequestPayloadRT,
  postBeatsListingResponsePayloadRT,
} from '../../../../../common/http_api/beats';
import { getBeats, getStats } from '../../../../lib/beats';
import { createValidationFunction } from '../../../../lib/create_route_validation_function';
import { handleError } from '../../../../lib/errors';
import { getIndexPatterns } from '../../../../../common/get_index_patterns';
import { MonitoringCore } from '../../../../types';

export function beatsListingRoute(server: MonitoringCore) {
  const validateParams = createValidationFunction(postBeatsListingRequestParamsRT);
  const validateBody = createValidationFunction(postBeatsListingRequestPayloadRT);

  server.route({
    method: 'post',
    path: '/api/monitoring/v1/clusters/{clusterUuid}/beats/beats',
    validate: {
      params: validateParams,
      body: validateBody,
    },
    options: {
      access: 'internal',
    },
    async handler(req) {
      const config = server.config;
      const ccs = req.payload.ccs;
      const clusterUuid = req.params.clusterUuid;
      const beatsIndexPattern = getIndexPatterns({
        ccs,
        config,
        moduleType: 'beats',
      });

      try {
        const [stats, listing] = await Promise.all([
          getStats(req, beatsIndexPattern, clusterUuid),
          getBeats(req, beatsIndexPattern, clusterUuid),
        ]);

        return postBeatsListingResponsePayloadRT.encode({
          stats,
          listing,
        });
      } catch (err) {
        throw handleError(err, req);
      }
    },
  });
}
