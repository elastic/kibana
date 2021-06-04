/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { first, last } from 'lodash';
import moment from 'moment';
import { schema } from '@kbn/config-schema';
import { i18n } from '@kbn/i18n';
import { METRIC_EXPLORER_AGGREGATIONS } from '../../../../common/http_api/metrics_explorer';
import {
  mapToConditionsLookup,
  formatAlertResult,
  FIRED_ACTIONS,
  WARNING_ACTIONS,
} from './metric_threshold_executor';
import { AlertStates, METRIC_THRESHOLD_ALERT_TYPE_ID, Comparator } from './types';
import { InfraBackendLibs } from '../../infra_types';
import { oneOfLiterals, validateIsStringElasticsearchJSONFilter } from '../common/utils';
import {
  groupActionVariableDescription,
  alertStateActionVariableDescription,
  reasonActionVariableDescription,
  timestampActionVariableDescription,
  valueActionVariableDescription,
  metricActionVariableDescription,
  thresholdActionVariableDescription,
} from '../common/messages';

import { RecoveredActionGroup } from '../../../../../alerting/common';
import {
  buildErrorAlertReason,
  buildFiredAlertReason,
  buildNoDataAlertReason,
  // buildRecoveredAlertReason,
  stateToAlertMessage,
} from '../common/messages';
import { evaluateAlert } from './lib/evaluate_alert';

export function registerMetricThresholdAlertType(libs: InfraBackendLibs) {
  const baseCriterion = {
    threshold: schema.arrayOf(schema.number()),
    comparator: oneOfLiterals(Object.values(Comparator)),
    timeUnit: schema.string(),
    timeSize: schema.number(),
    warningThreshold: schema.maybe(schema.arrayOf(schema.number())),
    warningComparator: schema.maybe(oneOfLiterals(Object.values(Comparator))),
  };

  const nonCountCriterion = schema.object({
    ...baseCriterion,
    metric: schema.string(),
    aggType: oneOfLiterals(METRIC_EXPLORER_AGGREGATIONS),
  });

  const countCriterion = schema.object({
    ...baseCriterion,
    aggType: schema.literal('count'),
    metric: schema.never(),
  });

  return libs.createMetricsLifecycleRuleType({
    id: METRIC_THRESHOLD_ALERT_TYPE_ID,
    name: i18n.translate('xpack.infra.metrics.alertName', {
      defaultMessage: 'Metric threshold',
    }),
    validate: {
      params: schema.object(
        {
          criteria: schema.arrayOf(schema.oneOf([countCriterion, nonCountCriterion])),
          groupBy: schema.maybe(schema.oneOf([schema.string(), schema.arrayOf(schema.string())])),
          filterQuery: schema.maybe(
            schema.string({
              validate: validateIsStringElasticsearchJSONFilter,
            })
          ),
          sourceId: schema.string(),
          alertOnNoData: schema.maybe(schema.boolean()),
        },
        { unknowns: 'allow' }
      ),
    },
    defaultActionGroupId: FIRED_ACTIONS.id,
    actionGroups: [FIRED_ACTIONS, WARNING_ACTIONS],
    minimumLicenseRequired: 'basic',
    executor: async ({ services, params }) => {
      const { criteria } = params;
      if (criteria.length === 0) throw new Error('Cannot execute an alert with 0 conditions');

      const { sourceId, alertOnNoData } = params;

      const source = await libs.sources.getSourceConfiguration(
        services.savedObjectsClient,
        sourceId || 'default'
      );
      const config = source.configuration;
      const alertResults = await evaluateAlert(
        services.scopedClusterClient.asCurrentUser,
        // @ts-expect-error
        params,
        config
      );

      // Because each alert result has the same group definitions, just grab the groups from the first one.
      const groups = Object.keys(first(alertResults)!);
      for (const group of groups) {
        // AND logic; all criteria must be across the threshold
        const shouldAlertFire = alertResults.every((result) =>
          // Grab the result of the most recent bucket
          last(result[group].shouldFire)
        );
        const shouldAlertWarn = alertResults.every((result) => last(result[group].shouldWarn));
        // AND logic; because we need to evaluate all criteria, if one of them reports no data then the
        // whole alert is in a No Data/Error state
        const isNoData = alertResults.some((result) => last(result[group].isNoData));
        const isError = alertResults.some((result) => result[group].isError);

        const nextState = isError
          ? AlertStates.ERROR
          : isNoData
          ? AlertStates.NO_DATA
          : shouldAlertFire
          ? AlertStates.ALERT
          : shouldAlertWarn
          ? AlertStates.WARNING
          : AlertStates.OK;

        let reason;
        if (nextState === AlertStates.ALERT || nextState === AlertStates.WARNING) {
          reason = alertResults
            .map((result) =>
              buildFiredAlertReason(
                formatAlertResult(result[group], nextState === AlertStates.WARNING)
              )
            )
            .join('\n');
          /*
           * Custom recovery actions aren't yet available in the alerting framework
           * Uncomment the code below once they've been implemented
           * Reference: https://github.com/elastic/kibana/issues/87048
           */
          // } else if (nextState === AlertStates.OK && prevState?.alertState === AlertStates.ALERT) {
          // reason = alertResults
          //   .map((result) => buildRecoveredAlertReason(formatAlertResult(result[group])))
          //   .join('\n');
        }
        if (alertOnNoData) {
          if (nextState === AlertStates.NO_DATA) {
            reason = alertResults
              .filter((result) => result[group].isNoData)
              .map((result) => buildNoDataAlertReason(result[group]))
              .join('\n');
          } else if (nextState === AlertStates.ERROR) {
            reason = alertResults
              .filter((result) => result[group].isError)
              .map((result) => buildErrorAlertReason(result[group].metric))
              .join('\n');
          }
        }
        if (reason) {
          const firstResult = first(alertResults);
          const timestamp = (firstResult && firstResult[group].timestamp) ?? moment().toISOString();
          const actionGroupId =
            nextState === AlertStates.OK
              ? RecoveredActionGroup.id
              : nextState === AlertStates.WARNING
              ? WARNING_ACTIONS.id
              : FIRED_ACTIONS.id;

          services
            .alertWithLifecycle({
              id: `${group}`,
              fields: {},
            })
            .scheduleActions(actionGroupId, {
              group,
              alertState: stateToAlertMessage[nextState],
              reason,
              timestamp,
              value: mapToConditionsLookup(
                alertResults,
                (result) => formatAlertResult(result[group]).currentValue
              ),
              threshold: mapToConditionsLookup(
                alertResults,
                (result) => formatAlertResult(result[group]).threshold
              ),
              metric: mapToConditionsLookup(criteria, (c) => c.metric),
            });
        }
      }
    },
    // executor: createMetricThresholdExecutor(libs),
    actionVariables: {
      context: [
        { name: 'group', description: groupActionVariableDescription },
        { name: 'alertState', description: alertStateActionVariableDescription },
        { name: 'reason', description: reasonActionVariableDescription },
        { name: 'timestamp', description: timestampActionVariableDescription },
        { name: 'value', description: valueActionVariableDescription },
        { name: 'metric', description: metricActionVariableDescription },
        { name: 'threshold', description: thresholdActionVariableDescription },
      ],
    },
    producer: 'infrastructure',
  });
}
