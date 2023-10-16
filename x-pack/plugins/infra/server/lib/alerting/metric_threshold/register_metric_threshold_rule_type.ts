/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_APP_CATEGORIES } from '@kbn/core/server';
import { schema } from '@kbn/config-schema';
import { i18n } from '@kbn/i18n';
import { ActionGroupIdsOf } from '@kbn/alerting-plugin/common';
import {
  GetViewInAppRelativeUrlFnOpts,
  PluginSetupContract,
  RuleType,
} from '@kbn/alerting-plugin/server';
import { observabilityPaths } from '@kbn/observability-plugin/common';
import type { InfraConfig } from '../../../../common/plugin_config_types';
import { Comparator, METRIC_THRESHOLD_ALERT_TYPE_ID } from '../../../../common/alerting/metrics';
import { METRIC_EXPLORER_AGGREGATIONS } from '../../../../common/http_api';
import { InfraBackendLibs } from '../../infra_types';
import {
  alertDetailUrlActionVariableDescription,
  alertStateActionVariableDescription,
  cloudActionVariableDescription,
  containerActionVariableDescription,
  groupByKeysActionVariableDescription,
  hostActionVariableDescription,
  labelsActionVariableDescription,
  metricActionVariableDescription,
  orchestratorActionVariableDescription,
  originalAlertStateActionVariableDescription,
  originalAlertStateWasActionVariableDescription,
  reasonActionVariableDescription,
  tagsActionVariableDescription,
  thresholdActionVariableDescription,
  timestampActionVariableDescription,
  valueActionVariableDescription,
  viewInAppUrlActionVariableDescription,
} from '../common/messages';
import { oneOfLiterals, validateIsStringElasticsearchJSONFilter } from '../common/utils';
import {
  createMetricThresholdExecutor,
  FIRED_ACTIONS,
  WARNING_ACTIONS,
  NO_DATA_ACTIONS,
} from './metric_threshold_executor';
import { MetricsRulesTypeAlertDefinition } from '../register_rule_types';
import { O11Y_AAD_FIELDS } from '../../../../common/constants';

type MetricThresholdAllowedActionGroups = ActionGroupIdsOf<
  typeof FIRED_ACTIONS | typeof WARNING_ACTIONS | typeof NO_DATA_ACTIONS
>;
export type MetricThresholdAlertType = Omit<RuleType, 'ActionGroupIdsOf'> & {
  ActionGroupIdsOf: MetricThresholdAllowedActionGroups;
};

export async function registerMetricThresholdRuleType(
  alertingPlugin: PluginSetupContract,
  libs: InfraBackendLibs,
  { featureFlags }: InfraConfig
) {
  if (!featureFlags.metricThresholdAlertRuleEnabled) {
    return;
  }

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
    customMetrics: schema.never(),
    equation: schema.never(),
    label: schema.never(),
  });

  const countCriterion = schema.object({
    ...baseCriterion,
    aggType: schema.literal('count'),
    metric: schema.never(),
    customMetrics: schema.never(),
    equation: schema.never(),
    label: schema.never(),
  });

  const customCriterion = schema.object({
    ...baseCriterion,
    aggType: schema.literal('custom'),
    metric: schema.never(),
    customMetrics: schema.arrayOf(
      schema.oneOf([
        schema.object({
          name: schema.string(),
          aggType: oneOfLiterals(['avg', 'sum', 'max', 'min', 'cardinality']),
          field: schema.string(),
          filter: schema.never(),
        }),
        schema.object({
          name: schema.string(),
          aggType: schema.literal('count'),
          filter: schema.maybe(schema.string()),
          field: schema.never(),
        }),
      ])
    ),
    equation: schema.maybe(schema.string()),
    label: schema.maybe(schema.string()),
  });

  const groupActionVariableDescription = i18n.translate(
    'xpack.infra.metrics.alerting.groupActionVariableDescription',
    {
      defaultMessage:
        'Name of the group(s) reporting data. For accessing each group key, use context.groupByKeys.',
    }
  );

  alertingPlugin.registerType({
    id: METRIC_THRESHOLD_ALERT_TYPE_ID,
    name: i18n.translate('xpack.infra.metrics.alertName', {
      defaultMessage: 'Metric threshold',
    }),
    fieldsForAAD: O11Y_AAD_FIELDS,
    validate: {
      params: schema.object(
        {
          criteria: schema.arrayOf(
            schema.oneOf([countCriterion, nonCountCriterion, customCriterion])
          ),
          groupBy: schema.maybe(schema.oneOf([schema.string(), schema.arrayOf(schema.string())])),
          filterQuery: schema.maybe(
            schema.string({
              validate: validateIsStringElasticsearchJSONFilter,
            })
          ),
          sourceId: schema.string(),
          alertOnNoData: schema.maybe(schema.boolean()),
          alertOnGroupDisappear: schema.maybe(schema.boolean()),
        },
        { unknowns: 'allow' }
      ),
    },
    defaultActionGroupId: FIRED_ACTIONS.id,
    actionGroups: [FIRED_ACTIONS, WARNING_ACTIONS, NO_DATA_ACTIONS],
    minimumLicenseRequired: 'basic',
    isExportable: true,
    executor: createMetricThresholdExecutor(libs),
    doesSetRecoveryContext: true,
    actionVariables: {
      context: [
        { name: 'group', description: groupActionVariableDescription },
        { name: 'groupByKeys', description: groupByKeysActionVariableDescription },
        {
          name: 'alertDetailsUrl',
          description: alertDetailUrlActionVariableDescription,
          usesPublicBaseUrl: true,
        },
        { name: 'alertState', description: alertStateActionVariableDescription },
        { name: 'reason', description: reasonActionVariableDescription },
        { name: 'timestamp', description: timestampActionVariableDescription },
        { name: 'value', description: valueActionVariableDescription },
        { name: 'metric', description: metricActionVariableDescription },
        { name: 'threshold', description: thresholdActionVariableDescription },
        {
          name: 'viewInAppUrl',
          description: viewInAppUrlActionVariableDescription,
          usesPublicBaseUrl: true,
        },
        { name: 'cloud', description: cloudActionVariableDescription },
        { name: 'host', description: hostActionVariableDescription },
        { name: 'container', description: containerActionVariableDescription },
        { name: 'orchestrator', description: orchestratorActionVariableDescription },
        { name: 'labels', description: labelsActionVariableDescription },
        { name: 'tags', description: tagsActionVariableDescription },
        { name: 'originalAlertState', description: originalAlertStateActionVariableDescription },
        {
          name: 'originalAlertStateWasALERT',
          description: originalAlertStateWasActionVariableDescription,
        },
        {
          name: 'originalAlertStateWasWARNING',
          description: originalAlertStateWasActionVariableDescription,
        },
        {
          name: 'originalAlertStateWasNO_DATA',
          description: originalAlertStateWasActionVariableDescription,
        },
      ],
    },
    category: DEFAULT_APP_CATEGORIES.observability.id,
    producer: 'infrastructure',
    alerts: MetricsRulesTypeAlertDefinition,
    getViewInAppRelativeUrl: ({ rule }: GetViewInAppRelativeUrlFnOpts<{}>) =>
      observabilityPaths.ruleDetails(rule.id),
  });
}
