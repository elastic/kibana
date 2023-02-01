/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, Type } from '@kbn/config-schema';
import { i18n } from '@kbn/i18n';
import { PluginSetupContract } from '@kbn/alerting-plugin/server';
import { TimeUnitChar } from '@kbn/observability-plugin/common/utils/formatters/duration';
import {
  Comparator,
  METRIC_INVENTORY_THRESHOLD_ALERT_TYPE_ID,
} from '../../../../common/alerting/metrics';
import {
  SnapshotCustomAggregation,
  SNAPSHOT_CUSTOM_AGGREGATIONS,
} from '../../../../common/http_api/snapshot_api';
import {
  InventoryItemType,
  SnapshotMetricType,
  SnapshotMetricTypeKeys,
} from '../../../../common/inventory_models/types';
import { InfraBackendLibs } from '../../infra_types';
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
import {
  getAlertDetailsPageEnabledForApp,
  oneOfLiterals,
  validateIsStringElasticsearchJSONFilter,
} from '../common/utils';
import {
  createInventoryMetricThresholdExecutor,
  FIRED_ACTIONS,
  FIRED_ACTIONS_ID,
  WARNING_ACTIONS,
} from './inventory_metric_threshold_executor';

const condition = schema.object({
  threshold: schema.arrayOf(schema.number()),
  comparator: oneOfLiterals(Object.values(Comparator)) as Type<Comparator>,
  timeUnit: schema.string() as Type<TimeUnitChar>,
  timeSize: schema.number(),
  metric: oneOfLiterals(Object.keys(SnapshotMetricTypeKeys)) as Type<SnapshotMetricType>,
  warningThreshold: schema.maybe(schema.arrayOf(schema.number())),
  warningComparator: schema.maybe(oneOfLiterals(Object.values(Comparator))) as Type<
    Comparator | undefined
  >,
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

export async function registerMetricInventoryThresholdRuleType(
  alertingPlugin: PluginSetupContract,
  libs: InfraBackendLibs
) {
  const config = libs.getAlertDetailsConfig();

  alertingPlugin.registerType({
    id: METRIC_INVENTORY_THRESHOLD_ALERT_TYPE_ID,
    name: i18n.translate('xpack.infra.metrics.inventory.alertName', {
      defaultMessage: 'Inventory',
    }),
    validate: {
      params: schema.object(
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
      ),
    },
    defaultActionGroupId: FIRED_ACTIONS_ID,
    doesSetRecoveryContext: true,
    actionGroups: [FIRED_ACTIONS, WARNING_ACTIONS],
    producer: 'infrastructure',
    minimumLicenseRequired: 'basic',
    isExportable: true,
    executor: createInventoryMetricThresholdExecutor(libs),
    actionVariables: {
      context: [
        { name: 'group', description: groupActionVariableDescription },
        { name: 'alertState', description: alertStateActionVariableDescription },
        ...(getAlertDetailsPageEnabledForApp(config, 'metrics')
          ? [{ name: 'alertDetailsUrl', description: alertDetailUrlActionVariableDescription }]
          : []),
        { name: 'reason', description: reasonActionVariableDescription },
        { name: 'timestamp', description: timestampActionVariableDescription },
        { name: 'value', description: valueActionVariableDescription },
        { name: 'metric', description: metricActionVariableDescription },
        { name: 'threshold', description: thresholdActionVariableDescription },
        { name: 'viewInAppUrl', description: viewInAppUrlActionVariableDescription },
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
    getSummarizedAlerts: libs.metricsRules.createGetSummarizedAlerts(),
  });
}
