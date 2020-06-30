/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { i18n } from '@kbn/i18n';
import React from 'react';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { AlertTypeModel } from '../../../../../triggers_actions_ui/public/types';
import { LOG_DOCUMENT_COUNT_ALERT_TYPE_ID } from '../../../../common/alerting/logs/types';
import { validateExpression } from './validation';

export function getAlertType(): AlertTypeModel {
  return {
    id: LOG_DOCUMENT_COUNT_ALERT_TYPE_ID,
    name: i18n.translate('xpack.infra.logs.alertFlyout.alertName', {
      defaultMessage: 'Log threshold',
    }),
    iconClass: 'bell',
    alertParamsExpression: React.lazy(() => import('./expression_editor/editor')),
    validate: validateExpression,
    defaultActionMessage: i18n.translate(
      'xpack.infra.logs.alerting.threshold.defaultActionMessage',
      {
        defaultMessage: `\\{\\{#context.group\\}\\}\\{\\{context.group\\}\\} - \\{\\{/context.group\\}\\}\\{\\{context.matchingDocuments\\}\\} log entries have matched the following conditions: \\{\\{context.conditions\\}\\}`,
      }
    ),
    requiresAppContext: false,
  };
}
