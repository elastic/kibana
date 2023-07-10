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
import {
  OBSERVABILITY_THRESHOLD_RULE_TYPE_ID,
  SLO_BURN_RATE_RULE_TYPE_ID,
} from '../../common/constants';
import { validateBurnRateRule } from '../components/burn_rate_rule_editor/validation';
import { validateMetricThreshold } from '../components/threshold/components/validation';
import { formatReason } from '../components/threshold/rule_data_formatters';

const sloBurnRateDefaultActionMessage = i18n.translate(
  'xpack.observability.slo.rules.burnRate.defaultActionMessage',
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
  'xpack.observability.slo.rules.burnRate.defaultRecoveryMessage',
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

export const registerObservabilityRuleTypes = (
  config: ConfigSchema,
  observabilityRuleTypeRegistry: ObservabilityRuleTypeRegistry
) => {
  observabilityRuleTypeRegistry.register({
    id: SLO_BURN_RATE_RULE_TYPE_ID,
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
      return `${docLinks.links.observability.sloBurnRateRule}`;
    },
    ruleParamsExpression: lazy(() => import('../components/burn_rate_rule_editor')),
    validate: validateBurnRateRule,
    requiresAppContext: false,
    defaultActionMessage: sloBurnRateDefaultActionMessage,
    defaultRecoveryMessage: sloBurnRateDefaultRecoveryMessage,
  });

  if (config.unsafe.thresholdRule.enabled) {
    observabilityRuleTypeRegistry.register({
      id: OBSERVABILITY_THRESHOLD_RULE_TYPE_ID,
      description: i18n.translate(
        'xpack.observability.threshold.rule.alertFlyout.alertDescription',
        {
          defaultMessage:
            'Alert when any Observability data type reaches or exceeds a given value.',
        }
      ),
      iconClass: 'bell',
      documentationUrl(docLinks) {
        return `${docLinks.links.observability.threshold}`;
      },
      ruleParamsExpression: lazy(() => import('../components/threshold/components/expression')),
      validate: validateMetricThreshold,
      defaultActionMessage: i18n.translate(
        'xpack.observability.threshold.rule.alerting.threshold.defaultActionMessage',
        {
          defaultMessage: `\\{\\{alertName\\}\\} - \\{\\{context.group\\}\\} is in a state of \\{\\{context.alertState\\}\\}

  Reason:
  \\{\\{context.reason\\}\\}
  `,
        }
      ),
      requiresAppContext: false,
      format: formatReason,
      alertDetailsAppSection: lazy(
        () => import('../components/threshold/components/alert_details_app_section')
      ),
    });
  }
};
