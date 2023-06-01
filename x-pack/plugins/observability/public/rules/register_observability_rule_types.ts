/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { lazy } from 'react';
import { i18n } from '@kbn/i18n';
import { ALERT_REASON } from '@kbn/rule-data-utils';

import { SLO_ID_FIELD } from '../../common/field_names/infra_metrics';
import { ConfigSchema } from '../plugin';
import { ObservabilityRuleTypeRegistry } from './create_observability_rule_type_registry';
import { SLO_BURN_RATE_RULE_ID } from '../../common/constants';
import { validateBurnRateRule } from '../components/burn_rate_rule_editor/validation';

export const registerObservabilityRuleTypes = (
  config: ConfigSchema,
  observabilityRuleTypeRegistry: ObservabilityRuleTypeRegistry
) => {
  observabilityRuleTypeRegistry.register({
    id: SLO_BURN_RATE_RULE_ID,
    description: i18n.translate('xpack.observability.slo.rules.burnRate.description', {
      defaultMessage: 'Alert when your SLO burn rate is too high over a defined period of time.',
    }),
    format: ({ fields }) => {
      return {
        reason: fields[ALERT_REASON] ?? '-',
        link: `/app/observability/slos/${fields[SLO_ID_FIELD]}`,
      };
    },
    iconClass: 'bell',
    documentationUrl(docLinks) {
      return 'https://www.elastic.co/guide/en/observability/current/slo-burn-rate-alert.html';
    },
    ruleParamsExpression: lazy(() => import('../components/burn_rate_rule_editor')),
    validate: validateBurnRateRule,
    requiresAppContext: false,
    defaultActionMessage: i18n.translate(
      'xpack.observability.slo.rules.burnRate.defaultActionMessage',
      {
        defaultMessage: `The rule \\{\\{rule.name\\}\\} for the SLO '\\{\\{context.sloName\\}\\}' is firing:
- Reason: \\{\\{context.reason\\}\\}
- The burn rate over the last \\{\\{context.longWindow.duration\\}\\} is \\{\\{context.longWindow.burnRate\\}\\}
- The burn rate over the last \\{\\{context.shortWindow.duration\\}\\} is \\{\\{context.shortWindow.burnRate\\}\\}
- The burn rate threshold is set to \\{\\{context.burnRateThreshold\\}\\}
- View in the SLO details page: \\{\\{context.viewInAppUrl\\}\\}`,
      }
    ),
  });
};
