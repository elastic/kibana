/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lazy } from 'react';
import { i18n } from '@kbn/i18n';
import { ALERT_REASON } from '@kbn/rule-data-utils';
import { ObservabilityRuleTypeRegistry } from '@kbn/observability-plugin/public/rules/create_observability_rule_type_registry';
import { SLO_BURN_RATE_RULE_TYPE_ID } from '@kbn/rule-data-utils';
import { SLO_ID_FIELD, SLO_INSTANCE_ID_FIELD } from '../../common/field_names/slo';
import { validateBurnRateRule } from '../components/burn_rate_rule_editor/validation';

const sloBurnRateDefaultActionMessage = i18n.translate(
  'xpack.slo.rules.burnRate.defaultActionMessage',
  {
    defaultMessage: `\\{\\{context.reason\\}\\}

\\{\\{rule.name\\}\\} is active with the following conditions:

- SLO: \\{\\{context.sloName\\}\\}'
- The burn rate over the last \\{\\{context.longWindow.duration\\}\\} is \\{\\{context.longWindow.burnRate\\}\\}
- The burn rate over the last \\{\\{context.shortWindow.duration\\}\\} is \\{\\{context.shortWindow.burnRate\\}\\}
- Threshold: \\{\\{context.burnRateThreshold\\}\\}

[View alert details](\\{\\{context.alertDetailsUrl\\}\\})
`,
  }
);
const sloBurnRateDefaultRecoveryMessage = i18n.translate(
  'xpack.slo.rules.burnRate.defaultRecoveryMessage',
  {
    defaultMessage: `\\{\\{context.reason\\}\\}

\\{\\{rule.name\\}\\} has recovered.

- SLO: \\{\\{context.sloName\\}\\}'
- The burn rate over the last \\{\\{context.longWindow.duration\\}\\} is \\{\\{context.longWindow.burnRate\\}\\}
- The burn rate over the last \\{\\{context.shortWindow.duration\\}\\} is \\{\\{context.shortWindow.burnRate\\}\\}
- Threshold: \\{\\{context.burnRateThreshold\\}\\}

[View alert details](\\{\\{context.alertDetailsUrl\\}\\})
`,
  }
);

export const registerBurnRateRuleType = async (
  observabilityRuleTypeRegistry: ObservabilityRuleTypeRegistry
) => {
  observabilityRuleTypeRegistry.register({
    id: SLO_BURN_RATE_RULE_TYPE_ID,
    description: i18n.translate('xpack.slo.rules.burnRate.description', {
      defaultMessage: 'Alert when your SLO burn rate is too high over a defined period of time.',
    }),
    format: ({ fields }) => {
      return {
        reason: fields[ALERT_REASON] ?? '-',
        link: `/app/slos/${fields[SLO_ID_FIELD]}?instanceId=${
          fields[SLO_INSTANCE_ID_FIELD] ?? '*'
        }`,
      };
    },
    iconClass: 'bell',
    documentationUrl(docLinks) {
      return `${docLinks.links.observability.sloBurnRateRule}`;
    },
    ruleParamsExpression: lazy(() => import('../components/burn_rate_rule_editor')),
    validate: validateBurnRateRule,
    requiresAppContext: false,
    defaultActionMessage: sloBurnRateDefaultActionMessage,
    defaultRecoveryMessage: sloBurnRateDefaultRecoveryMessage,
    alertDetailsAppSection: lazy(
      () => import('../components/slo/burn_rate/alert_details/alert_details_app_section')
    ),
    priority: 100,
  });
};
