/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lazy } from 'react';
import { i18n } from '@kbn/i18n';
import {
  ActionTypeModel,
  ConnectorValidationResult,
  GenericValidationResult,
} from '../../../../types';
import { EmailActionParams, EmailConfig, EmailSecrets, EmailActionConnector } from '../types';

export function getActionType(): ActionTypeModel<EmailConfig, EmailSecrets, EmailActionParams> {
  const mailformat = /^[^@\s]+@[^@\s]+$/;
  return {
    id: '.email',
    iconClass: 'email',
    selectMessage: i18n.translate(
      'xpack.triggersActionsUI.components.builtinActionTypes.emailAction.selectMessageText',
      {
        defaultMessage: 'Send email from your server.',
      }
    ),
    actionTypeTitle: i18n.translate(
      'xpack.triggersActionsUI.components.builtinActionTypes.emailAction.actionTypeTitle',
      {
        defaultMessage: 'Send to email',
      }
    ),
    validateConnector: async (
      action: EmailActionConnector
    ): Promise<
      ConnectorValidationResult<Omit<EmailConfig, 'secure' | 'hasAuth'>, EmailSecrets>
    > => {
      const translations = await import('./translations');
      const configErrors = {
        from: new Array<string>(),
        port: new Array<string>(),
        host: new Array<string>(),
      };
      const secretsErrors = {
        user: new Array<string>(),
        password: new Array<string>(),
      };

      const validationResult = {
        config: { errors: configErrors },
        secrets: { errors: secretsErrors },
      };
      if (!action.config.from) {
        configErrors.from.push(translations.SENDER_REQUIRED);
      }
      if (action.config.from && !action.config.from.trim().match(mailformat)) {
        configErrors.from.push(translations.SENDER_NOT_VALID);
      }
      if (!action.config.port) {
        configErrors.port.push(translations.PORT_REQUIRED);
      }
      if (!action.config.host) {
        configErrors.host.push(translations.HOST_REQUIRED);
      }
      if (action.config.hasAuth && !action.secrets.user && !action.secrets.password) {
        secretsErrors.user.push(translations.USERNAME_REQUIRED);
      }
      if (action.config.hasAuth && !action.secrets.user && !action.secrets.password) {
        secretsErrors.password.push(translations.PASSWORD_REQUIRED);
      }
      if (action.secrets.user && !action.secrets.password) {
        secretsErrors.password.push(translations.PASSWORD_REQUIRED_FOR_USER_USED);
      }
      if (!action.secrets.user && action.secrets.password) {
        secretsErrors.user.push(
          i18n.translate(
            'xpack.triggersActionsUI.components.builtinActionTypes.error.requiredUserText',
            {
              defaultMessage: 'Username is required when password is used.',
            }
          )
        );
      }
      return validationResult;
    },
    validateParams: async (
      actionParams: EmailActionParams
    ): Promise<GenericValidationResult<EmailActionParams>> => {
      const translations = await import('./translations');
      const errors = {
        to: new Array<string>(),
        cc: new Array<string>(),
        bcc: new Array<string>(),
        message: new Array<string>(),
        subject: new Array<string>(),
      };
      const validationResult = { errors };
      if (
        (!(actionParams.to instanceof Array) || actionParams.to.length === 0) &&
        (!(actionParams.cc instanceof Array) || actionParams.cc.length === 0) &&
        (!(actionParams.bcc instanceof Array) || actionParams.bcc.length === 0)
      ) {
        const errorText = translations.TO_CC_REQUIRED;
        errors.to.push(errorText);
        errors.cc.push(errorText);
        errors.bcc.push(errorText);
      }
      if (!actionParams.message?.length) {
        errors.message.push(translations.MESSAGE_REQUIRED);
      }
      if (!actionParams.subject?.length) {
        errors.subject.push(translations.SUBJECT_REQUIRED);
      }
      return validationResult;
    },
    actionConnectorFields: lazy(() => import('./email_connector')),
    actionParamsFields: lazy(() => import('./email_params')),
  };
}
