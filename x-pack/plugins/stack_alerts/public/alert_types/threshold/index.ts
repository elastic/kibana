/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lazy } from 'react';
import { i18n } from '@kbn/i18n';
import { validateExpression } from './validation';
import { IndexThresholdAlertParams } from './types';
import { RuleTypeModel } from '../../../../triggers_actions_ui/public';

export function getAlertType(): RuleTypeModel<IndexThresholdAlertParams> {
  return {
    id: '.index-threshold',
    description: i18n.translate('xpack.stackAlerts.threshold.ui.alertType.descriptionText', {
      defaultMessage: 'Alert when an aggregated query meets the threshold.',
    }),
    iconClass: 'alert',
    documentationUrl: (docLinks) => docLinks.links.alerting.indexThreshold,
    ruleParamsExpression: lazy(() => import('./expression')),
    validate: validateExpression,
    defaultActionMessage: i18n.translate(
      'xpack.stackAlerts.threshold.ui.alertType.defaultActionMessage',
      {
        defaultMessage: `alert '\\{\\{alertName\\}\\}' is active for group '\\{\\{context.group\\}\\}':

- Value: \\{\\{context.value\\}\\}
- Conditions Met: \\{\\{context.conditions\\}\\} over \\{\\{params.timeWindowSize\\}\\}\\{\\{params.timeWindowUnit\\}\\}
- Timestamp: \\{\\{context.date\\}\\}`,
      }
    ),
    requiresAppContext: false,
  };
}
