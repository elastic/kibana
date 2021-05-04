/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as t from 'io-ts';
import { propsToSchema } from '@kbn/io-ts-utils/target/props_to_schema';
import moment from 'moment';
import { ValuesType } from 'utility-types';
import { parseInterval } from '../../../../../../../src/plugins/data/common';
import { metricConfigRt } from '../../../../common/rules/metric_config_rt';
import { AlertType, ALERT_TYPES_CONFIG } from '../../../../common/alert_types';
import {
  createLifecycleRuleTypeFactory,
  getRuleExecutorData,
} from '../../../../../rule_registry/server';
import { RegisterRuleDependencies } from '../register_apm_alerts';
import { resolvePass, PassResponse } from './resolve_pass';

export function registerMetricRuleType({
  alerting,
  logger,
  ruleDataClient,
}: RegisterRuleDependencies) {
  const createLifecycleRuleType = createLifecycleRuleTypeFactory({
    ruleDataClient,
    logger,
  });

  const ruleTypeConfig = ALERT_TYPES_CONFIG[AlertType.Metric];

  const type = {
    ...ruleTypeConfig,
    id: AlertType.Metric,
  };

  alerting.registerType(
    createLifecycleRuleType({
      ...type,
      validate: {
        params: propsToSchema(
          t.type({
            config: metricConfigRt,
          })
        ),
      },
      executor: async (options) => {
        const {
          services: { scopedClusterClient },
        } = options;

        const ruleDataWriter = ruleDataClient.getWriter();
        const ruleExecutorData = getRuleExecutorData(type, options);

        const { config } = options.params;

        const until = moment(
          options.startedAt.getTime() -
            parseInterval(config.query_delay)!.asMilliseconds()
        )
          .startOf('minute')
          .valueOf();

        const series: Array<ValuesType<PassResponse>> = [];
        for (const pass of config.passes) {
          series.push(
            ...(await resolvePass({
              by: config.by,
              pass,
              ruleDataWriter,
              scopedClusterClient,
              until,
              ruleExecutorData,
            }))
          );
        }
      },
    })
  );
}
