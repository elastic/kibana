/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import moment from 'moment';
import { prefixIndexPattern } from '../../../../../common/ccs_utils';
import { getKibanaClusterStatus } from './_get_kibana_cluster_status';
import { getMetrics } from '../../../../lib/details/get_metrics';
import { metricSet } from './metric_set_overview';
import { handleError } from '../../../../lib/errors';
import { getRules } from '../../../../lib/kibana/kibana_metrics/get_rules';
import { getSeries } from '../../../../lib/details/get_series';
import { calculateTimeseriesInterval } from '../../../../lib/calculate_timeseries_interval';
import { getTimezone } from '../../../../lib/get_timezone';
import { INDEX_PATTERN_KIBANA } from '../../../../../common/constants';

export function kibanaOverviewRoute(server) {
  /**
   * Kibana overview (metrics)
   */
  server.route({
    method: 'POST',
    path: '/api/monitoring/v1/clusters/{clusterUuid}/kibana',
    config: {
      validate: {
        params: schema.object({
          clusterUuid: schema.string(),
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
    async handler(req) {
      const config = server.config();
      const ccs = req.payload.ccs;
      const clusterUuid = req.params.clusterUuid;
      const kbnIndexPattern = prefixIndexPattern(config, INDEX_PATTERN_KIBANA, ccs);

      async function getDriftByRuleId() {
        const rules = await getRules(req, kbnIndexPattern, { clusterUuid });

        const config = req.server.config();
        // TODO: Pass in req parameters as explicit function parameters
        const min = moment.utc(req.payload.timeRange.min).valueOf();
        const max = moment.utc(req.payload.timeRange.max).valueOf();
        const minIntervalSeconds = Number(config.get('monitoring.ui.min_interval_seconds'));
        const bucketSize = calculateTimeseriesInterval(min, max, minIntervalSeconds);
        const timezone = await getTimezone(req);

        return await Promise.all(
          rules.map(async (rule) => {
            const series = await getSeries(
              req,
              kbnIndexPattern,
              'kibana_rule_drift',
              {},
              [
                {
                  term: { 'kibana_metrics.rule.id': { value: rule.id } },
                },
              ],
              null,
              {
                min,
                max,
                bucketSize,
                timezone,
              }
            );

            series.metric.label = series.metric.label.replace('[ruleName]', rule.name);
            return series;
          })
        );
      }

      try {
        const [clusterStatus, metrics, ruleDrift] = await Promise.all([
          getKibanaClusterStatus(req, kbnIndexPattern, { clusterUuid }),
          getMetrics(req, kbnIndexPattern, metricSet, [
            {
              bool: {
                should: [
                  { term: { type: 'kibana_stats' } },
                  { term: { 'metricset.name': 'stats' } },
                ],
              },
            },
          ]),
          getDriftByRuleId(),
        ]);

        metrics.kibana_rule_drift = ruleDrift;

        // console.log('metrics: ');
        // console.log(JSON.stringify(metrics));
        // console.log('rules: ')
        // console.log(JSON.stringify(ruleDrift));
        // console.log('*****************')

        return {
          clusterStatus,
          metrics,
        };
      } catch (err) {
        throw handleError(err, req);
      }
    },
  });
}
