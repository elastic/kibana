/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { lazy } from 'react';
import { i18n } from '@kbn/i18n';
import { ALERT_REASON } from '@kbn/rule-data-utils';

import { ConfigSchema } from '../plugin';
import { ObservabilityRuleTypeRegistry } from './create_observability_rule_type_registry';
import { SLO_BURN_RATE_RULE_ID } from '../../common/constants';
import { validateBurnRateRule } from '../components/app/burn_rate_rule_editor/validation';

export const registerObservabilityRuleTypes = (
  config: ConfigSchema,
  observabilityRuleTypeRegistry: ObservabilityRuleTypeRegistry
) => {
  if (config.unsafe.slo.enabled) {
    observabilityRuleTypeRegistry.register({
      id: SLO_BURN_RATE_RULE_ID,
      description: i18n.translate('xpack.observability.slo.rules.burnRate.description', {
        defaultMessage: 'Alert when your SLO burn rate is too high over a defined period of time.',
      }),
      format: ({ fields }) => {
        return {
          reason: fields[ALERT_REASON] ?? '-',
          link: '/app/observability/slos',
        };
      },
      iconClass: 'bell',
      documentationUrl(docLinks) {
        return '/unknown/docs';
      },
      ruleParamsExpression: lazy(() => import('../components/app/burn_rate_rule_editor')),
      validate: validateBurnRateRule,
      requiresAppContext: false,
      defaultActionMessage: i18n.translate(
        'xpack.observability.slo.rules.burnRate.defaultActionMessage',
        {
          defaultMessage: `\\{\\{rule.name\\}\\} is firing:
- Reason: \\{\\{context.reason\\}\\}`,
        }
      ),
    });
  }
};
