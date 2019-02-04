/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Joi from 'joi';
import { getClustersFromRequest } from '../../../../lib/cluster/get_clusters_from_request';
import { handleError } from '../../../../lib/errors';
import { prefixIndexPattern } from '../../../../lib/ccs_utils';
import {
  INDEX_PATTERN_KIBANA,
  INDEX_PATTERN_ELASTICSEARCH,
  INDEX_PATTERN_LOGSTASH,
  INDEX_PATTERN_BEATS,
  INDEX_ALERTS
} from '../../../../../common/constants';

export function clusterRoute(server) {
  /*
   * Cluster Overview
   */
  server.route({
    method: 'POST',
    path: '/api/monitoring/v1/clusters/{clusterUuid}',
    config: {
      validate: {
        params: Joi.object({
          clusterUuid: Joi.string().required()
        }),
        payload: Joi.object({
          ccs: Joi.string().optional(),
          timeRange: Joi.object({
            min: Joi.date().required(),
            max: Joi.date().required()
          }).required()
        })
      }
    },
    handler: (req) => {
      const config = server.config();
      const ccs = req.payload.ccs;
      const esIndexPattern = prefixIndexPattern(config, INDEX_PATTERN_ELASTICSEARCH, ccs);
      const kbnIndexPattern = prefixIndexPattern(config, INDEX_PATTERN_KIBANA, ccs);
      const lsIndexPattern = prefixIndexPattern(config, INDEX_PATTERN_LOGSTASH, ccs);
      const beatsIndexPattern = prefixIndexPattern(config, INDEX_PATTERN_BEATS, ccs);
      const apmIndexPattern = prefixIndexPattern(config, INDEX_PATTERN_BEATS, ccs);
      const alertsIndex = prefixIndexPattern(config, INDEX_ALERTS, ccs);
      const indexPatterns = { esIndexPattern, kbnIndexPattern, lsIndexPattern, beatsIndexPattern, apmIndexPattern, alertsIndex };
      const options = {
        clusterUuid: req.params.clusterUuid,
        start: req.payload.timeRange.min,
        end: req.payload.timeRange.max,
      };

      return getClustersFromRequest(req, indexPatterns, options)
        .catch(err => handleError(err, req));
    }
  });
}
