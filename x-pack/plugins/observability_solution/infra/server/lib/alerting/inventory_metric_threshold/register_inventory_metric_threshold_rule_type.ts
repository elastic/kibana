/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, Type } from '@kbn/config-schema';
import { i18n } from '@kbn/i18n';
import { DEFAULT_APP_CATEGORIES } from '@kbn/core/server';
import { GetViewInAppRelativeUrlFnOpts, PluginSetupContract } from '@kbn/alerting-plugin/server';
import { observabilityPaths } from '@kbn/observability-plugin/common';
import { TimeUnitChar } from '@kbn/observability-plugin/common/utils/formatters/duration';
import {
  InventoryItemType,
  SnapshotMetricType,
  SnapshotMetricTypeKeys,
} from '@kbn/metrics-data-access-plugin/common';
import { COMPARATORS } from '@kbn/alerting-comparators';
import { LEGACY_COMPARATORS } from '@kbn/observability-plugin/common/utils/convert_legacy_outside_comparator';
import {
  SnapshotCustomAggregation,
  SNAPSHOT_CUSTOM_AGGREGATIONS,
} from '../../../../common/http_api';
import type { InfraConfig } from '../../../../common/plugin_config_types';
import { METRIC_INVENTORY_THRESHOLD_ALERT_TYPE_ID } from '../../../../common/alerting/metrics';
import { InfraBackendLibs, InfraLocators } from '../../infra_types';
import {
  alertDetailUrlActionVariableDescription,
  alertStateActionVariableDescription,
  cloudActionVariableDescription,
  containerActionVariableDescription,
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
  createInventoryMetricThresholdExecutor,
  FIRED_ACTIONS,
  FIRED_ACTIONS_ID,
  WARNING_ACTIONS,
} from './inventory_metric_threshold_executor';
import { MetricsRulesTypeAlertDefinition } from '../register_rule_types';
import { O11Y_AAD_FIELDS } from '../../../../common/constants';

const comparators = Object.values({ ...COMPARATORS, ...LEGACY_COMPARATORS });
const condition = schema.object({
  threshold: schema.arrayOf(schema.number()),
  comparator: oneOfLiterals(comparators) as Type<COMPARATORS>,
  timeUnit: schema.string() as Type<TimeUnitChar>,
  timeSize: schema.number(),
  metric: oneOfLiterals(Object.keys(SnapshotMetricTypeKeys)) as Type<SnapshotMetricType>,
  warningThreshold: schema.maybe(schema.arrayOf(schema.number())),
  warningComparator: schema.maybe(oneOfLiterals(comparators)) as Type<COMPARATORS | undefined>,
  customMetric: schema.maybe(
    schema.object({
      type: schema.literal('custom'),
      id: schema.string(),
      field: schema.string(),
      aggregation: oneOfLiterals(SNAPSHOT_CUSTOM_AGGREGATIONS) as Type<SnapshotCustomAggregation>,
      label: schema.maybe(schema.string()),
    })
  ),
});

const groupActionVariableDescription = i18n.translate(
  'xpack.infra.inventory.alerting.groupActionVariableDescription',
  {
    defaultMessage: 'Name of the group reporting data',
  }
);

export function registerInventoryThresholdRuleType(
  alertingPlugin: PluginSetupContract,
  libs: InfraBackendLibs,
  { featureFlags }: InfraConfig,
  locators: InfraLocators
) {
  if (!featureFlags.inventoryThresholdAlertRuleEnabled) {
    return;
  }

  const paramsSchema = schema.object(
    {
      criteria: schema.arrayOf(condition),
      nodeType: schema.string() as Type<InventoryItemType>,
      filterQuery: schema.maybe(
        schema.string({ validate: validateIsStringElasticsearchJSONFilter })
      ),
      sourceId: schema.string(),
      alertOnNoData: schema.maybe(schema.boolean()),
    },
    { unknowns: 'allow' }
  );

  alertingPlugin.registerType({
    id: METRIC_INVENTORY_THRESHOLD_ALERT_TYPE_ID,
    name: i18n.translate('xpack.infra.metrics.inventory.alertName', {
      defaultMessage: 'Inventory',
    }),
    validate: {
      params: paramsSchema,
    },
    schemas: {
      params: {
        type: 'config-schema',
        schema: paramsSchema,
      },
    },
    defaultActionGroupId: FIRED_ACTIONS_ID,
    doesSetRecoveryContext: true,
    actionGroups: [FIRED_ACTIONS, WARNING_ACTIONS],
    category: DEFAULT_APP_CATEGORIES.observability.id,
    producer: 'infrastructure',
    minimumLicenseRequired: 'basic',
    isExportable: true,
    executor: createInventoryMetricThresholdExecutor(libs, locators),
    actionVariables: {
      context: [
        { name: 'group', description: groupActionVariableDescription },
        { name: 'alertState', description: alertStateActionVariableDescription },
        {
          name: 'alertDetailsUrl',
          description: alertDetailUrlActionVariableDescription,
          usesPublicBaseUrl: true,
        },
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
      ],
    },
    alerts: MetricsRulesTypeAlertDefinition,
    fieldsForAAD: O11Y_AAD_FIELDS,
    getViewInAppRelativeUrl: ({ rule }: GetViewInAppRelativeUrlFnOpts<{}>) =>
      observabilityPaths.ruleDetails(rule.id),
  });
}
