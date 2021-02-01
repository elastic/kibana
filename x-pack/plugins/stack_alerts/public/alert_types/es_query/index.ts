/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { lazy } from 'react';
import { i18n } from '@kbn/i18n';
import { validateExpression } from './validation';
import { EsQueryAlertParams } from './types';
import { AlertTypeModel } from '../../../../triggers_actions_ui/public';

export function getAlertType(): AlertTypeModel<EsQueryAlertParams> {
  return {
    id: '.es-query',
    description: i18n.translate('xpack.stackAlerts.esQuery.ui.alertType.descriptionText', {
      defaultMessage: 'Alert on matches against an ES query.',
    }),
    iconClass: 'logoElastic',
    documentationUrl(docLinks) {
      return `${docLinks.ELASTIC_WEBSITE_URL}guide/en/kibana/${docLinks.DOC_LINK_VERSION}/alert-types.html#alert-type-es-query`;
    },
    alertParamsExpression: lazy(() => import('./expression')),
    validate: validateExpression,
    defaultActionMessage: i18n.translate(
      'xpack.stackAlerts.esQuery.ui.alertType.defaultActionMessage',
      {
        defaultMessage: `ES query alert '\\{\\{alertName\\}\\}' is active:

- Value: \\{\\{context.value\\}\\}
- Conditions Met: \\{\\{context.conditions\\}\\} over \\{\\{params.timeWindowSize\\}\\}\\{\\{params.timeWindowUnit\\}\\}
- Timestamp: \\{\\{context.date\\}\\}`,
      }
    ),
    requiresAppContext: false,
  };
}
