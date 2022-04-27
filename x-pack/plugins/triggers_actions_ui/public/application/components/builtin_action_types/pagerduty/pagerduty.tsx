/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lazy } from 'react';
import { i18n } from '@kbn/i18n';
import moment from 'moment';
import {
  ActionTypeModel,
  GenericValidationResult,
  ConnectorValidationResult,
} from '../../../../types';
import {
  PagerDutyActionConnector,
  PagerDutyConfig,
  PagerDutySecrets,
  PagerDutyActionParams,
  EventActionOptions,
} from '../types';
import { hasMustacheTokens } from '../../../lib/has_mustache_tokens';

export function getActionType(): ActionTypeModel<
  PagerDutyConfig,
  PagerDutySecrets,
  PagerDutyActionParams
> {
  return {
    id: '.pagerduty',
    iconClass: lazy(() => import('./logo')),
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
    validateConnector: async (
      action: PagerDutyActionConnector
    ): Promise<ConnectorValidationResult<PagerDutyConfig, PagerDutySecrets>> => {
      const translations = await import('./translations');
      const secretsErrors = {
        routingKey: new Array<string>(),
      };
      const validationResult = {
        secrets: { errors: secretsErrors },
      };

      if (!action.secrets.routingKey) {
        secretsErrors.routingKey.push(translations.INTEGRATION_KEY_REQUIRED);
      }
      return validationResult;
    },
    validateParams: async (
      actionParams: PagerDutyActionParams
    ): Promise<
      GenericValidationResult<Pick<PagerDutyActionParams, 'summary' | 'timestamp' | 'dedupKey'>>
    > => {
      const translations = await import('./translations');
      const errors = {
        summary: new Array<string>(),
        timestamp: new Array<string>(),
        dedupKey: new Array<string>(),
      };
      const validationResult = { errors };
      if (
        !actionParams.dedupKey?.length &&
        (actionParams.eventAction === 'resolve' || actionParams.eventAction === 'acknowledge')
      ) {
        errors.dedupKey.push(translations.DEDUP_KEY_REQUIRED);
      }
      if (
        actionParams.eventAction === EventActionOptions.TRIGGER &&
        !actionParams.summary?.length
      ) {
        errors.summary.push(translations.SUMMARY_REQUIRED);
      }
      if (actionParams.timestamp && !hasMustacheTokens(actionParams.timestamp)) {
        if (!moment(actionParams.timestamp).isValid()) {
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
