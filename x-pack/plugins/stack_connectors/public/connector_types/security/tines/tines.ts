/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lazy } from 'react';
import { i18n } from '@kbn/i18n';
import type {
  ActionTypeModel as ConnectorTypeModel,
  GenericValidationResult,
} from '@kbn/triggers-actions-ui-plugin/public';
import { TinesActionParams, TinesConfig, TinesSecrets } from './types';

export function getConnectorType(): ConnectorTypeModel<
  TinesConfig,
  TinesSecrets,
  TinesActionParams
> {
  return {
    id: '.tines',
    iconClass: lazy(() => import('./logo')),
    selectMessage: i18n.translate(
      'xpack.triggersActionsUI.components.builtinActionTypes.tinesAction.selectMessageText',
      {
        defaultMessage: 'Send events to a Story.',
      }
    ),
    actionTypeTitle: i18n.translate(
      'xpack.triggersActionsUI.components.builtinActionTypes.tinesAction.actionTypeTitle',
      {
        defaultMessage: 'Tines',
      }
    ),
    validateParams: async (
      actionParams: TinesActionParams
    ): Promise<GenericValidationResult<TinesActionParams>> => {
      const translations = await import('./translations');
      const errors = {
        subAction: new Array<string>(),
        subActionParams: {
          body: new Array<string>(),
          dedupKey: new Array<string>(),
          webhook: new Array<string>(),
          story: new Array<string>(),
        },
      };
      const validationResult = { errors };
      validationResult.errors = errors;
      const { subAction, subActionParams } = actionParams;

      if (!subAction) {
        errors.subAction.push(translations.ACTION_REQUIRED);
      } else if (subAction !== 'run' && subAction !== 'test') {
        errors.subAction.push(translations.INVALID_ACTION);
      } else if (subAction === 'test') {
        if (!subActionParams?.body?.length) {
          errors.subActionParams.body.push(translations.BODY_REQUIRED);
        } else {
          try {
            JSON.parse(subActionParams.body);
          } catch {
            errors.subActionParams.body.push(translations.BODY_INVALID);
          }
        }
      }

      if (!subActionParams?.webhook?.storyId) {
        errors.subActionParams.story.push(translations.STORY_REQUIRED);
      }
      if (!subActionParams?.webhook?.id) {
        errors.subActionParams.webhook.push(translations.WEBHOOK_REQUIRED);
      } else if (!subActionParams?.webhook?.path) {
        errors.subActionParams.webhook.push(translations.WEBHOOK_PATH_REQUIRED);
      } else if (!subActionParams?.webhook?.secret) {
        errors.subActionParams.webhook.push(translations.WEBHOOK_SECRET_REQUIRED);
      }
      return validationResult;
    },
    actionConnectorFields: lazy(() => import('./tines_connector')),
    actionParamsFields: lazy(() => import('./tines_params')),
  };
}
