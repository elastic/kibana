/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { RegisterAlertTypesParams } from '..';
import { createThresholdRuleType } from '../../types';
import * as IndexThreshold from './alert_type';
import { STACK_ALERTS_FEATURE_ID } from '../../../common';
import { ParamsSchema } from './alert_type_params';
import { ComparatorFns, getHumanReadableComparator } from '../lib';
import { TimeSeriesQuery } from '../../../../triggers_actions_ui/server';
import { BaseActionContext, addMessages } from './action_context';

// future enhancement: make these configurable?
export const MAX_INTERVALS = 1000;
export const MAX_GROUPS = 1000;
export const DEFAULT_GROUPS = 100;

export function register(registerParams: RegisterAlertTypesParams) {
  const { data, registry } = registerParams;
  registry.registerType(
    createThresholdRuleType({
      id: IndexThreshold.ID,
      name: IndexThreshold.RuleTypeName,
      actionGroups: [
        { id: IndexThreshold.RuleTypeActionGroupId, name: IndexThreshold.RuleTypeActionGroupName },
      ],
      defaultActionGroupId: IndexThreshold.RuleTypeActionGroupId,
      validate: {
        params: ParamsSchema,
      },
      actionVariables: {
        context: [
          { name: 'message', description: IndexThreshold.actionVariableContextMessageLabel },
          { name: 'title', description: IndexThreshold.actionVariableContextTitleLabel },
          { name: 'group', description: IndexThreshold.actionVariableContextGroupLabel },
          { name: 'date', description: IndexThreshold.actionVariableContextDateLabel },
          { name: 'value', description: IndexThreshold.actionVariableContextValueLabel },
          { name: 'conditions', description: IndexThreshold.actionVariableContextConditionsLabel },
        ],
        params: [
          { name: 'threshold', description: IndexThreshold.actionVariableContextThresholdLabel },
          {
            name: 'thresholdComparator',
            description: IndexThreshold.actionVariableContextThresholdComparatorLabel,
          },
          ...IndexThreshold.alertParamsVariables,
        ],
      },
      minimumLicenseRequired: 'basic',
      executor: async (options) => {
        const {
          rule,
          params,
          services: { writeRuleAlert, writeRuleMetric, logger, scopedClusterClient },
        } = options;

        const compareFn = ComparatorFns.get(params.thresholdComparator);
        if (compareFn == null) {
          throw new Error(
            i18n.translate('xpack.stackAlerts.indexThreshold.invalidComparatorErrorMessage', {
              defaultMessage: 'invalid thresholdComparator specified: {comparator}',
              values: {
                comparator: params.thresholdComparator,
              },
            })
          );
        }

        const esClient = scopedClusterClient.asCurrentUser;
        const date = new Date().toISOString();
        // the undefined values below are for config-schema optional types
        const queryParams: TimeSeriesQuery = {
          index: params.index,
          timeField: params.timeField,
          aggType: params.aggType,
          aggField: params.aggField,
          groupBy: params.groupBy,
          termField: params.termField,
          termSize: params.termSize,
          dateStart: date,
          dateEnd: date,
          timeWindowSize: params.timeWindowSize,
          timeWindowUnit: params.timeWindowUnit,
          interval: undefined,
        };
        // console.log(`index_threshold: query: ${JSON.stringify(queryParams, null, 4)}`);
        const result = await (await data).timeSeriesQuery({
          logger,
          esClient,
          query: queryParams,
        });
        logger.debug(
          `alert ${IndexThreshold.ID}:${rule.uuid} "${rule.name}" query result: ${JSON.stringify(
            result
          )}`
        );

        const groupResults = result.results || [];
        // console.log(`index_threshold: response: ${JSON.stringify(groupResults, null, 4)}`);
        for (const groupResult of groupResults) {
          const instanceId = groupResult.group;
          const value = groupResult.metrics[0][1];
          const met = compareFn(value, params.threshold);

          // According to the issue description for https://github.com/elastic/kibana/issues/93728
          // This would be considered "extra documents [which] are typically immutable and provide
          // extra details for the Alert"
          // This will show up in the alerts-as-data index as event.kind: "metric"
          writeRuleMetric({
            id: instanceId,
            fields: {
              'kibana.rac.alert.value': value,
              'kibana.rac.alert.threshold': params.threshold[0],
            },
          });

          if (!met) continue;

          const agg = params.aggField
            ? `${params.aggType}(${params.aggField})`
            : `${params.aggType}`;
          const humanFn = `${agg} is ${getHumanReadableComparator(
            params.thresholdComparator
          )} ${params.threshold.join(' and ')}`;

          const baseContext: BaseActionContext = {
            date,
            group: instanceId,
            value,
            conditions: humanFn,
          };
          const actionContext = addMessages(rule.name, baseContext, params);
          writeRuleAlert({
            id: instanceId,
            fields: {
              'kibana.rac.alert.value': value,
              'kibana.rac.alert.threshold': params.threshold[0],
            },
          }).scheduleActions(IndexThreshold.RuleTypeActionGroupId, actionContext);
          logger.debug(`scheduled actionGroup: ${JSON.stringify(actionContext)}`);
        }

        return {};
      },
      producer: STACK_ALERTS_FEATURE_ID,
    })
  );
}
