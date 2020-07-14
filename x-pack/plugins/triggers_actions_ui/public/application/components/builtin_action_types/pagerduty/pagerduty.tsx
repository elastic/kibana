/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { lazy } from 'react';
import { i18n } from '@kbn/i18n';
import moment from 'moment';
import { ActionTypeModel, ValidationResult } from '../../../../types';
import { PagerDutyActionParams, PagerDutyActionConnector } from '.././types';
import pagerDutySvg from './pagerduty.svg';
import { hasMustacheTokens } from '../../../lib/has_mustache_tokens';

export function getActionType(): ActionTypeModel {
  return {
    id: '.pagerduty',
    iconClass: pagerDutySvg,
    selectMessage: i18n.translate(
      'xpack.triggersActionsUI.components.builtinActionTypes.pagerDutyAction.selectMessageText',
      {
        defaultMessage: 'Send an event in PagerDuty.',
      }
    ),
    actionTypeTitle: i18n.translate(
      'xpack.triggersActionsUI.components.builtinActionTypes.pagerDutyAction.actionTypeTitle',
      {
        defaultMessage: 'Send to PagerDuty',
      }
    ),
    validateConnector: (action: PagerDutyActionConnector): ValidationResult => {
      const validationResult = { errors: {} };
      const errors = {
        routingKey: new Array<string>(),
      };
      validationResult.errors = errors;
      if (!action.secrets.routingKey) {
        errors.routingKey.push(
          i18n.translate(
            'xpack.triggersActionsUI.components.builtinActionTypes.pagerDutyAction.error.requiredRoutingKeyText',
            {
              defaultMessage: 'A routing key is required.',
            }
          )
        );
      }
      return validationResult;
    },
    validateParams: (actionParams: PagerDutyActionParams): ValidationResult => {
      const validationResult = { errors: {} };
      const errors = {
        summary: new Array<string>(),
        timestamp: new Array<string>(),
      };
      validationResult.errors = errors;
      if (!actionParams.summary?.length) {
        errors.summary.push(
          i18n.translate(
            'xpack.triggersActionsUI.components.builtinActionTypes.pagerDutyAction.error.requiredSummaryText',
            {
              defaultMessage: 'Summary is required.',
            }
          )
        );
      }
      if (actionParams.timestamp && !hasMustacheTokens(actionParams.timestamp)) {
        if (isNaN(Date.parse(actionParams.timestamp))) {
          const { nowShortFormat, nowLongFormat } = getValidTimestampExamples();
          errors.timestamp.push(
            i18n.translate(
              'xpack.triggersActionsUI.components.builtinActionTypes.pagerDutyAction.error.invalidTimestamp',
              {
                defaultMessage:
                  'Timestamp must be a valid date, such as {nowShortFormat} or {nowLongFormat}.',
                values: {
                  nowShortFormat,
                  nowLongFormat,
                },
              }
            )
          );
        }
      }
      return validationResult;
    },
    actionConnectorFields: lazy(() => import('./pagerduty_connectors')),
    actionParamsFields: lazy(() => import('./pagerduty_params')),
  };
}

function getValidTimestampExamples() {
  const now = moment();
  return {
    nowShortFormat: now.format('YYYY-MM-DD'),
    nowLongFormat: now.format('YYYY-MM-DD h:mm:ss'),
  };
}
