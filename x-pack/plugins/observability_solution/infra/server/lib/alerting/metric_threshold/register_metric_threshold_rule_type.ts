/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_APP_CATEGORIES } from '@kbn/core/server';
import { i18n } from '@kbn/i18n';
import { ActionGroupIdsOf } from '@kbn/alerting-plugin/common';
import {
  GetViewInAppRelativeUrlFnOpts,
  IRuleTypeAlerts,
  PluginSetupContract,
  RuleType,
} from '@kbn/alerting-plugin/server';
import { observabilityPaths } from '@kbn/observability-plugin/common';
import { 
  metricThresholdZodParamsSchema,
  metricThresholdZodParamsSchemaV1,
} from '@kbn/rule-data-utils';

import type { InfraConfig } from '../../../../common/plugin_config_types';
import { METRIC_THRESHOLD_ALERT_TYPE_ID } from '../../../../common/alerting/metrics';
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
import {
  createMetricThresholdExecutor,
  FIRED_ACTIONS,
  WARNING_ACTIONS,
  NO_DATA_ACTIONS,
  MetricThresholdAlert,
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
      params: {
        validate: (object: unknown) => {
          return metricThresholdZodParamsSchema.parse(object);
        },
      },
    },
    schemas: {
      params: { type: 'zod', schema: metricThresholdZodParamsSchemaV1 },
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
    alerts: {
      ...MetricsRulesTypeAlertDefinition,
      shouldWrite: true,
    } as IRuleTypeAlerts<MetricThresholdAlert>,
    getViewInAppRelativeUrl: ({ rule }: GetViewInAppRelativeUrlFnOpts<{}>) =>
      observabilityPaths.ruleDetails(rule.id),
  });
}
