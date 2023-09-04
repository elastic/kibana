/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { extractReferences, injectReferences } from '@kbn/data-plugin/common';
import { i18n } from '@kbn/i18n';
import { IRuleTypeAlerts, GetViewInAppRelativeUrlFnOpts } from '@kbn/alerting-plugin/server';
import { IBasePath, Logger } from '@kbn/core/server';
import { legacyExperimentalFieldMap } from '@kbn/alerts-as-data-utils';
import { createLifecycleExecutor, IRuleDataClient } from '@kbn/rule-registry-plugin/server';
import { LicenseType } from '@kbn/licensing-plugin/server';
import { LocatorPublic } from '@kbn/share-plugin/common';
import { EsQueryRuleParamsExtractedParams } from '@kbn/stack-alerts-plugin/server/rule_types/es_query/rule_type_params';
import {
  AlertsLocatorParams,
  observabilityFeatureId,
  observabilityPaths,
} from '../../../../common';
import { Comparator } from '../../../../common/threshold_rule/types';
import { OBSERVABILITY_THRESHOLD_RULE_TYPE_ID } from '../../../../common/constants';
import { THRESHOLD_RULE_REGISTRATION_CONTEXT } from '../../../common/constants';

import {
  alertDetailUrlActionVariableDescription,
  cloudActionVariableDescription,
  containerActionVariableDescription,
  groupByKeysActionVariableDescription,
  hostActionVariableDescription,
  labelsActionVariableDescription,
  orchestratorActionVariableDescription,
  reasonActionVariableDescription,
  tagsActionVariableDescription,
  timestampActionVariableDescription,
  valueActionVariableDescription,
} from './messages';
import { oneOfLiterals, validateKQLStringFilter } from './utils';
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
  ruleDataClient: IRuleDataClient,
  alertsLocator?: LocatorPublic<AlertsLocatorParams>
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
          filter: schema.maybe(
            schema.string({
              validate: validateKQLStringFilter,
            })
          ),
          field: schema.never(),
        }),
      ])
    ),
    equation: schema.maybe(schema.string()),
    label: schema.maybe(schema.string()),
  });

  return {
    id: OBSERVABILITY_THRESHOLD_RULE_TYPE_ID,
    name: i18n.translate('xpack.observability.threshold.ruleName', {
      defaultMessage: 'Threshold (Technical Preview)',
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
              validate: validateKQLStringFilter,
            })
          ),
          alertOnNoData: schema.maybe(schema.boolean()),
          alertOnGroupDisappear: schema.maybe(schema.boolean()),
          searchConfiguration: schema.object({
            index: schema.string(),
            query: schema.object({
              language: schema.string(),
              query: schema.string(),
            }),
          }),
        },
        { unknowns: 'allow' }
      ),
    },
    defaultActionGroupId: FIRED_ACTIONS.id,
    actionGroups: [FIRED_ACTIONS, NO_DATA_ACTIONS],
    minimumLicenseRequired: 'basic' as LicenseType,
    isExportable: true,
    executor: createLifecycleRuleExecutor(
      createMetricThresholdExecutor({ alertsLocator, basePath, logger, config })
    ),
    doesSetRecoveryContext: true,
    actionVariables: {
      context: [
        { name: 'groupings', description: groupByKeysActionVariableDescription },
        {
          name: 'alertDetailsUrl',
          description: alertDetailUrlActionVariableDescription,
          usesPublicBaseUrl: true,
        },
        { name: 'reason', description: reasonActionVariableDescription },
        { name: 'timestamp', description: timestampActionVariableDescription },
        { name: 'value', description: valueActionVariableDescription },
        { name: 'cloud', description: cloudActionVariableDescription },
        { name: 'host', description: hostActionVariableDescription },
        { name: 'container', description: containerActionVariableDescription },
        { name: 'orchestrator', description: orchestratorActionVariableDescription },
        { name: 'labels', description: labelsActionVariableDescription },
        { name: 'tags', description: tagsActionVariableDescription },
      ],
    },
    useSavedObjectReferences: {
      // TODO revisit types https://github.com/elastic/kibana/issues/159714
      extractReferences: (params: any) => {
        const [searchConfiguration, references] = extractReferences(params.searchConfiguration);
        const newParams = { ...params, searchConfiguration } as EsQueryRuleParamsExtractedParams;

        return { params: newParams, references };
      },
      injectReferences: (params: any, references: any) => {
        return {
          ...params,
          searchConfiguration: injectReferences(params.searchConfiguration, references),
        };
      },
    },
    producer: observabilityFeatureId,
    alerts: MetricsRulesTypeAlertDefinition,
    getViewInAppRelativeUrl: ({ rule }: GetViewInAppRelativeUrlFnOpts<{}>) =>
      observabilityPaths.ruleDetails(rule.id),
  };
}
