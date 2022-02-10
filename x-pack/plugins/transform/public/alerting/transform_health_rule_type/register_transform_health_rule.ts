/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lazy } from 'react';
import { i18n } from '@kbn/i18n';
import { TRANSFORM_RULE_TYPE } from '../../../common';
import type { TransformHealthRuleParams } from '../../../common/types/alerting';
import type { RuleTypeModel } from '../../../../triggers_actions_ui/public';

export function getTransformHealthRuleType(): RuleTypeModel<TransformHealthRuleParams> {
  return {
    id: TRANSFORM_RULE_TYPE.TRANSFORM_HEALTH,
    description: i18n.translate('xpack.transform.alertingRuleTypes.transformHealth.description', {
      defaultMessage: 'Alert when transforms experience operational issues.',
    }),
    iconClass: 'bell',
    documentationUrl(docLinks) {
      return docLinks.links.transforms.alertingRules;
    },
    ruleParamsExpression: lazy(() => import('./transform_health_rule_trigger')),
    validate: (ruleParams: TransformHealthRuleParams) => {
      const validationResult = {
        errors: {
          includeTransforms: new Array<string>(),
        } as Record<keyof TransformHealthRuleParams, string[]>,
      };

      if (!ruleParams.includeTransforms?.length) {
        validationResult.errors.includeTransforms?.push(
          i18n.translate(
            'xpack.transform.alertTypes.transformHealth.includeTransforms.errorMessage',
            {
              defaultMessage: 'At least one transform has to be selected',
            }
          )
        );
      }

      return validationResult;
    },
    requiresAppContext: false,
    defaultActionMessage: i18n.translate(
      'xpack.transform.alertTypes.transformHealth.defaultActionMessage',
      {
        defaultMessage: `[\\{\\{rule.name\\}\\}] Transform health check result:
\\{\\{context.message\\}\\}
\\{\\{#context.results\\}\\}
  Transform ID: \\{\\{transform_id\\}\\}
  \\{\\{#description\\}\\}Transform description: \\{\\{description\\}\\}
  \\{\\{/description\\}\\}\\{\\{#transform_state\\}\\}Transform state: \\{\\{transform_state\\}\\}
  \\{\\{/transform_state\\}\\}\\{\\{#failure_reason\\}\\}Failure reason: \\{\\{failure_reason\\}\\}
  \\{\\{/failure_reason\\}\\}\\{\\{#notification_message\\}\\}Notification message: \\{\\{notification_message\\}\\}
  \\{\\{/notification_message\\}\\}\\{\\{#node_name\\}\\}Node name: \\{\\{node_name\\}\\}
  \\{\\{/node_name\\}\\}\\{\\{#timestamp\\}\\}Timestamp: \\{\\{timestamp\\}\\}
  \\{\\{/timestamp\\}\\}

\\{\\{/context.results\\}\\}
`,
      }
    ),
  };
}
