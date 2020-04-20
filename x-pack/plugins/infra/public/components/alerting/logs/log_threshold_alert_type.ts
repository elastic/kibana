/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { i18n } from '@kbn/i18n';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { AlertTypeModel } from '../../../../../triggers_actions_ui/public/types';
import { LOG_DOCUMENT_COUNT_ALERT_TYPE_ID } from '../../../../common/alerting/logs/types';
import { ExpressionEditor } from './expression_editor';
import { validateExpression } from './validation';

export function getAlertType(): AlertTypeModel {
  return {
    id: LOG_DOCUMENT_COUNT_ALERT_TYPE_ID,
    name: i18n.translate('xpack.infra.logs.alertFlyout.alertName', {
      defaultMessage: 'Log threshold',
    }),
    iconClass: 'bell',
    alertParamsExpression: ExpressionEditor,
    validate: validateExpression,
    defaultActionMessage: i18n.translate(
      'xpack.infra.logs.alerting.threshold.defaultActionMessage',
      {
        defaultMessage: `\\{\\{context.matchingDocuments\\}\\} log entries have matched the following conditions: \\{\\{context.conditions\\}\\}`,
      }
    ),
  };
}
