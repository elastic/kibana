/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lazy } from 'react';
import { i18n } from '../../../../../../../../../../private/var/tmp/_bazel_darnautov/1afe62330ff0d9ae1ca2013aad33fd76/execroot/kibana/bazel-out/darwin-fastbuild/bin/packages/kbn-i18n';
import type { TriggersAndActionsUIPublicPluginSetup } from '../../../../triggers_actions_ui/public';
import { TRANSFORM_RULE_TYPE } from '../../../common/constants';
import type { TransformHealthRuleParams } from '../../../common/types/alerting';

export function registerTransformHealthRule(
  triggersActionsUi: TriggersAndActionsUIPublicPluginSetup
) {
  triggersActionsUi.ruleTypeRegistry.register({
    id: TRANSFORM_RULE_TYPE.TRANSFORM_HEALTH,
    description: i18n.translate('xpack.transform.alertingRuleTypes.transformHealth.description', {
      defaultMessage: 'Alert when transform jobs experience operational issues.',
    }),
    iconClass: 'bell',
    documentationUrl(docLinks) {
      return docLinks.links.transforms.alertingRules;
    },
    alertParamsExpression: lazy(() => import('./transform_health_rule_trigger')),
    validate: (alertParams: TransformHealthRuleParams) => {
      const validationResult = {
        errors: {
          includeTransforms: new Array<string>(),
        } as Record<keyof TransformHealthRuleParams, string[]>,
      };

      return validationResult;
    },
    requiresAppContext: false,
    defaultActionMessage: i18n.translate(
      'xpack.ml.alertTypes.jobsHealthAlertingRule.defaultActionMessage',
      {
        defaultMessage: `[\\{\\{rule.name\\}\\}] Transforms health check result:
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
  });
}
