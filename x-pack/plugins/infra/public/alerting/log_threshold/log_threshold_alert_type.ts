/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { i18n } from '@kbn/i18n';
import React from 'react';
import { AlertTypeModel } from '../../../../triggers_actions_ui/public';
import { LOG_DOCUMENT_COUNT_ALERT_TYPE_ID } from '../../../common/alerting/logs/log_threshold/types';
import { validateExpression } from './validation';

export function getAlertType(): AlertTypeModel {
  return {
    id: LOG_DOCUMENT_COUNT_ALERT_TYPE_ID,
    description: i18n.translate('xpack.infra.logs.alertFlyout.alertDescription', {
      defaultMessage: 'Alert when the log aggregation exceeds the threshold.',
    }),
    iconClass: 'bell',
    documentationUrl(docLinks) {
      return `${docLinks.ELASTIC_WEBSITE_URL}guide/en/observability/${docLinks.DOC_LINK_VERSION}/logs-threshold-alert.html`;
    },
    alertParamsExpression: React.lazy(() => import('./components/expression_editor/editor')),
    validate: validateExpression,
    defaultActionMessage: i18n.translate(
      'xpack.infra.logs.alerting.threshold.defaultActionMessage',
      {
        defaultMessage: `\\{\\{^context.isRatio\\}\\}\\{\\{#context.group\\}\\}\\{\\{context.group\\}\\} - \\{\\{/context.group\\}\\}\\{\\{context.matchingDocuments\\}\\} log entries have matched the following conditions: \\{\\{context.conditions\\}\\}\\{\\{/context.isRatio\\}\\}\\{\\{#context.isRatio\\}\\}\\{\\{#context.group\\}\\}\\{\\{context.group\\}\\} - \\{\\{/context.group\\}\\} Ratio of the count of log entries matching \\{\\{context.numeratorConditions\\}\\} to the count of log entries matching \\{\\{context.denominatorConditions\\}\\} was \\{\\{context.ratio\\}\\}\\{\\{/context.isRatio\\}\\}`,
      }
    ),
    requiresAppContext: false,
  };
}
