/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { i18n } from '@kbn/i18n';
import { IRuleTypeAlerts } from '@kbn/alerting-plugin/server';
import { IBasePath, Logger } from '@kbn/core/server';
import { legacyExperimentalFieldMap } from '@kbn/alerts-as-data-utils';
import {
  createGetSummarizedAlertsFn,
  createLifecycleExecutor,
  IRuleDataClient,
} from '@kbn/rule-registry-plugin/server';
import { LicenseType } from '@kbn/licensing-plugin/server';
import { THRESHOLD_RULE_REGISTRATION_CONTEXT } from '../../../common/constants';
import { observabilityFeatureId } from '../../../../common';
import { Comparator } from '../../../../common/threshold_rule/types';
import { OBSERVABILITY_THRESHOLD_RULE_TYPE_ID } from '../../../../common/constants';

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
} from './messages';
import {
  getAlertDetailsPageEnabledForApp,
  oneOfLiterals,
  validateIsStringElasticsearchJSONFilter,
} from './utils';
import {
  createMetricThresholdExecutor,
  FIRED_ACTIONS,
  NO_DATA_ACTIONS,
} from './threshold_executor';
import { ObservabilityConfig } from '../../..';
import { METRIC_EXPLORER_AGGREGATIONS } from '../../../../common/threshold_rule/constants';

export const MetricsRulesTypeAlertDefinition: IRuleTypeAlerts = {
  context: THRESHOLD_RULE_REGISTRATION_CONTEXT,
  mappings: { fieldMap: legacyExperimentalFieldMap },
  useEcs: true,
  useLegacyAlerts: false,
};

type CreateLifecycleExecutor = ReturnType<typeof createLifecycleExecutor>;

export function thresholdRuleType(
  createLifecycleRuleExecutor: CreateLifecycleExecutor,
  basePath: IBasePath,
  config: ObservabilityConfig,
  logger: Logger,
  ruleDataClient: IRuleDataClient
) {
  const baseCriterion = {
    threshold: schema.arrayOf(schema.number()),
    comparator: oneOfLiterals(Object.values(Comparator)),
    timeUnit: schema.string(),
    timeSize: schema.number(),
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
  const getSummarizedAlerts = createGetSummarizedAlertsFn({
    ruleDataClient,
    useNamespace: false,
    isLifecycleAlert: false,
  });

  const groupActionVariableDescription = i18n.translate(
    'xpack.observability.threshold.rule.alerting.groupActionVariableDescription',
    {
      defaultMessage:
        'Name of the group(s) reporting data. For accessing each group key, use context.groupByKeys.',
    }
  );

  return {
    id: OBSERVABILITY_THRESHOLD_RULE_TYPE_ID,
    name: i18n.translate('xpack.observability.threshold.ruleName', {
      defaultMessage: 'Threshold',
    }),
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
    actionGroups: [FIRED_ACTIONS, NO_DATA_ACTIONS],
    minimumLicenseRequired: 'basic' as LicenseType,
    isExportable: true,
    executor: createLifecycleRuleExecutor(
      createMetricThresholdExecutor({ basePath, logger, config })
    ),
    doesSetRecoveryContext: true,
    actionVariables: {
      context: [
        { name: 'group', description: groupActionVariableDescription },
        { name: 'groupByKeys', description: groupByKeysActionVariableDescription },
        ...(getAlertDetailsPageEnabledForApp(config.unsafe.alertDetails, 'metrics')
          ? [
              {
                name: 'alertDetailsUrl',
                description: alertDetailUrlActionVariableDescription,
                usesPublicBaseUrl: true,
              },
            ]
          : []),
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
    producer: observabilityFeatureId,
    getSummarizedAlerts: getSummarizedAlerts(),
    alerts: MetricsRulesTypeAlertDefinition,
  };
}
