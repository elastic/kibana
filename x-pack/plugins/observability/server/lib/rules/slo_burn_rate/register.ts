/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { GetViewInAppRelativeUrlFnOpts } from '@kbn/alerting-plugin/server';
import { schema } from '@kbn/config-schema';
import { i18n } from '@kbn/i18n';
import { LicenseType } from '@kbn/licensing-plugin/server';
import { createLifecycleExecutor } from '@kbn/rule-registry-plugin/server';
import { legacyExperimentalFieldMap } from '@kbn/alerts-as-data-utils';
import { IBasePath } from '@kbn/core/server';
import { LocatorPublic } from '@kbn/share-plugin/common';
import { AlertsLocatorParams, observabilityPaths, sloFeatureId } from '../../../../common';
import { SLO_RULE_REGISTRATION_CONTEXT } from '../../../common/constants';

import {
  ALERT_ACTION,
  HIGH_PRIORITY_ACTION,
  LOW_PRIORITY_ACTION,
  MEDIUM_PRIORITY_ACTION,
  SLO_BURN_RATE_RULE_TYPE_ID,
} from '../../../../common/constants';

import { getRuleExecutor } from './executor';
import { sloRuleFieldMap } from './field_map';

const durationSchema = schema.object({
  value: schema.number(),
  unit: schema.string(),
});

const windowSchema = schema.object({
  id: schema.string(),
  burnRateThreshold: schema.number(),
  maxBurnRateThreshold: schema.nullable(schema.number()),
  longWindow: durationSchema,
  shortWindow: durationSchema,
  actionGroup: schema.string(),
});

type CreateLifecycleExecutor = ReturnType<typeof createLifecycleExecutor>;

export function sloBurnRateRuleType(
  createLifecycleRuleExecutor: CreateLifecycleExecutor,
  basePath: IBasePath,
  alertsLocator?: LocatorPublic<AlertsLocatorParams>
) {
  return {
    id: SLO_BURN_RATE_RULE_TYPE_ID,
    name: i18n.translate('xpack.observability.slo.rules.burnRate.name', {
      defaultMessage: 'SLO burn rate',
    }),
    validate: {
      params: schema.object({
        sloId: schema.string(),
        windows: schema.arrayOf(windowSchema),
      }),
    },
    defaultActionGroupId: ALERT_ACTION.id,
    actionGroups: [ALERT_ACTION, HIGH_PRIORITY_ACTION, MEDIUM_PRIORITY_ACTION, LOW_PRIORITY_ACTION],
    producer: sloFeatureId,
    minimumLicenseRequired: 'platinum' as LicenseType,
    isExportable: true,
    executor: createLifecycleRuleExecutor(getRuleExecutor({ basePath, alertsLocator })),
    doesSetRecoveryContext: true,
    actionVariables: {
      context: [
        { name: 'reason', description: reasonActionVariableDescription },
        { name: 'timestamp', description: timestampActionVariableDescription },
        { name: 'burnRateThreshold', description: thresholdActionVariableDescription },
        { name: 'longWindow', description: windowActionVariableDescription },
        { name: 'shortWindow', description: windowActionVariableDescription },
        { name: 'viewInAppUrl', description: viewInAppUrlActionVariableDescription },
        { name: 'alertDetailsUrl', description: alertDetailsUrlActionVariableDescription },
        { name: 'sloId', description: sloIdActionVariableDescription },
        { name: 'sloName', description: sloNameActionVariableDescription },
        { name: 'sloInstanceId', description: sloInstanceIdActionVariableDescription },
      ],
    },
    alerts: {
      context: SLO_RULE_REGISTRATION_CONTEXT,
      mappings: { fieldMap: { ...legacyExperimentalFieldMap, ...sloRuleFieldMap } },
      useEcs: false,
      useLegacyAlerts: true,
    },
    getViewInAppRelativeUrl: ({ rule }: GetViewInAppRelativeUrlFnOpts<{}>) =>
      observabilityPaths.ruleDetails(rule.id),
  };
}

const thresholdActionVariableDescription = i18n.translate(
  'xpack.observability.slo.alerting.thresholdDescription',
  {
    defaultMessage: 'The burn rate threshold value.',
  }
);

const windowActionVariableDescription = i18n.translate(
  'xpack.observability.slo.alerting.windowDescription',
  {
    defaultMessage: 'The window duration with the associated burn rate value.',
  }
);

export const reasonActionVariableDescription = i18n.translate(
  'xpack.observability.slo.alerting.reasonDescription',
  {
    defaultMessage: 'A concise description of the reason for the alert',
  }
);
export const timestampActionVariableDescription = i18n.translate(
  'xpack.observability.slo.alerting.timestampDescription',
  {
    defaultMessage: 'A timestamp of when the alert was detected.',
  }
);

export const viewInAppUrlActionVariableDescription = i18n.translate(
  'xpack.observability.slo.alerting.viewInAppUrlDescription',
  {
    defaultMessage: 'The url to the SLO details page to help with further investigation.',
  }
);

export const alertDetailsUrlActionVariableDescription = i18n.translate(
  'xpack.observability.slo.alerting.alertDetailsUrlDescription',
  {
    defaultMessage:
      'Link to the alert troubleshooting view for further context and details. This will be an empty string if the server.publicBaseUrl is not configured.',
  }
);

export const sloIdActionVariableDescription = i18n.translate(
  'xpack.observability.slo.alerting.sloIdDescription',
  {
    defaultMessage: 'The SLO unique identifier.',
  }
);

export const sloNameActionVariableDescription = i18n.translate(
  'xpack.observability.slo.alerting.sloNameDescription',
  {
    defaultMessage: 'The SLO name.',
  }
);

export const sloInstanceIdActionVariableDescription = i18n.translate(
  'xpack.observability.slo.alerting.sloInstanceIdDescription',
  {
    defaultMessage: 'The SLO instance id.',
  }
);
