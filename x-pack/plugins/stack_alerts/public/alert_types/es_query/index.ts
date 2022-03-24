/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lazy } from 'react';
import { i18n } from '@kbn/i18n';
import { validateExpression } from './validation';
import { EsQueryAlertParams } from './types';
import { RuleTypeModel } from '../../../../triggers_actions_ui/public';

export function getAlertType(): RuleTypeModel<EsQueryAlertParams> {
  return {
    id: '.es-query',
    description: i18n.translate('xpack.stackAlerts.esQuery.ui.alertType.descriptionText', {
      defaultMessage: 'Alert when matches are found during the latest query run.',
    }),
    iconClass: 'logoElastic',
    documentationUrl: (docLinks) => docLinks.links.alerting.esQuery,
    ruleParamsExpression: lazy(() => import('./expression')),
    validate: validateExpression,
    defaultActionMessage: i18n.translate(
      'xpack.stackAlerts.esQuery.ui.alertType.defaultActionMessage',
      {
        defaultMessage: `Elasticsearch query alert '\\{\\{alertName\\}\\}' is active:

- Value: \\{\\{context.value\\}\\}
- Conditions Met: \\{\\{context.conditions\\}\\} over \\{\\{params.timeWindowSize\\}\\}\\{\\{params.timeWindowUnit\\}\\}
- Timestamp: \\{\\{context.date\\}\\}`,
      }
    ),
    requiresAppContext: false,
  };
}
