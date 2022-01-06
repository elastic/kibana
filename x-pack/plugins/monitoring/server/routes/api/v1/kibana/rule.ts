/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
// @ts-ignore
import { handleError } from '../../../../lib/errors';
// @ts-ignore
import { getMetrics } from '../../../../lib/details/get_metrics';
// @ts-ignore
import { prefixIndexPattern } from '../../../../../common/ccs_utils';
// @ts-ignore
import { metricSet } from './metric_set_rule';
import { INDEX_PATTERN_KIBANA } from '../../../../../common/constants';
import { LegacyRequest, LegacyServer, RouteDependencies } from '../../../../types';
import { getRule } from '../../../../lib/kibana/kibana_rules/get_rule';

/**
 * Kibana instance: This will fetch all data required to display a Kibana
 * instance's page. The current details returned are:
 * - Kibana Instance Summary (Status)
 * - Metrics
 */
export function kibanaRuleRoute(server: LegacyServer, npRoute: RouteDependencies) {
  server.route({
    method: 'POST',
    path: '/api/monitoring/v1/clusters/{clusterUuid}/kibana/rule/{ruleId}',
    config: {
      validate: {
        params: schema.object({
          clusterUuid: schema.string(),
          ruleId: schema.string(),
        }),
        payload: schema.object({
          ccs: schema.maybe(schema.string()),
          timeRange: schema.object({
            min: schema.string(),
            max: schema.string(),
          }),
        }),
      },
    },
    async handler(req: LegacyRequest) {
      const config = server.config();
      const ccs = req.payload.ccs;
      const clusterUuid = req.params.clusterUuid;
      const ruleId = req.params.ruleId;
      const kbnIndexPattern = prefixIndexPattern(config, INDEX_PATTERN_KIBANA, ccs);

      try {
        const [metrics, rule] = await Promise.all([
          getMetrics(req, kbnIndexPattern, metricSet, [
            {
              bool: {
                should: [{ term: { 'kibana_rule.rule.id': ruleId } }],
              },
            },
          ]),
          getRule(req, kbnIndexPattern, ruleId, { clusterUuid }),
        ]);

        return {
          metrics,
          rule,
          // kibanaMetrics,
        };
      } catch (err) {
        throw handleError(err, req);
      }
    },
  });
}
