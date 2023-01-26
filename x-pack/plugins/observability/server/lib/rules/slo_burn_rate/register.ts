/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { i18n } from '@kbn/i18n';
import { LicenseType } from '@kbn/licensing-plugin/server';
import { createLifecycleExecutor } from '@kbn/rule-registry-plugin/server';

import { SLO_BURN_RATE_RULE_ID } from '../../../../common/constants';
import { FIRED_ACTION, getRuleExecutor } from './executor';

const durationSchema = schema.object({
  value: schema.number(),
  unit: schema.string(),
});

type CreateLifecycleExecutor = ReturnType<typeof createLifecycleExecutor>;

export function sloBurnRateRuleType(createLifecycleRuleExecutor: CreateLifecycleExecutor) {
  return {
    id: SLO_BURN_RATE_RULE_ID,
    name: i18n.translate('xpack.observability.slo.rules.burnRate.name', {
      defaultMessage: 'SLO burn rate',
    }),
    validate: {
      params: schema.object({
        sloId: schema.string(),
        burnRateThreshold: schema.number(),
        maxBurnRateThreshold: schema.number(),
        longWindow: durationSchema,
        shortWindow: durationSchema,
      }),
    },
    defaultActionGroupId: FIRED_ACTION.id,
    actionGroups: [FIRED_ACTION],
    producer: 'observability',
    minimumLicenseRequired: 'basic' as LicenseType,
    isExportable: true,
    executor: createLifecycleRuleExecutor(getRuleExecutor()),
    doesSetRecoveryContext: true,
    actionVariables: {
      context: [
        { name: 'reason', description: reasonActionVariableDescription },
        { name: 'timestamp', description: timestampActionVariableDescription },
        { name: 'burnRateThreshold', description: thresholdActionVariableDescription },
        { name: 'longWindow', description: windowActionVariableDescription },
        { name: 'shortWindow', description: windowActionVariableDescription },
      ],
    },
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
