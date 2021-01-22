/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
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
    validateConnector: (
      action: EmailActionConnector
    ): ConnectorValidationResult<Omit<EmailConfig, 'secure' | 'hasAuth'>, EmailSecrets> => {
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
        configErrors.from.push(
          i18n.translate(
            'xpack.triggersActionsUI.components.builtinActionTypes.error.requiredFromText',
            {
              defaultMessage: 'Sender is required.',
            }
          )
        );
      }
      if (action.config.from && !action.config.from.trim().match(mailformat)) {
        configErrors.from.push(
          i18n.translate(
            'xpack.triggersActionsUI.components.builtinActionTypes.error.formatFromText',
            {
              defaultMessage: 'Sender is not a valid email address.',
            }
          )
        );
      }
      if (!action.config.port) {
        configErrors.port.push(
          i18n.translate(
            'xpack.triggersActionsUI.components.builtinActionTypes.error.requiredPortText',
            {
              defaultMessage: 'Port is required.',
            }
          )
        );
      }
      if (!action.config.host) {
        configErrors.host.push(
          i18n.translate(
            'xpack.triggersActionsUI.components.builtinActionTypes.error.requiredHostText',
            {
              defaultMessage: 'Host is required.',
            }
          )
        );
      }
      if (action.config.hasAuth && !action.secrets.user && !action.secrets.password) {
        secretsErrors.user.push(
          i18n.translate(
            'xpack.triggersActionsUI.components.builtinActionTypes.error.requiredAuthUserNameText',
            {
              defaultMessage: 'Username is required.',
            }
          )
        );
      }
      if (action.config.hasAuth && !action.secrets.user && !action.secrets.password) {
        secretsErrors.password.push(
          i18n.translate(
            'xpack.triggersActionsUI.components.builtinActionTypes.error.requiredAuthPasswordText',
            {
              defaultMessage: 'Password is required.',
            }
          )
        );
      }
      if (action.secrets.user && !action.secrets.password) {
        secretsErrors.password.push(
          i18n.translate(
            'xpack.triggersActionsUI.components.builtinActionTypes.error.requiredPasswordText',
            {
              defaultMessage: 'Password is required when username is used.',
            }
          )
        );
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
    validateParams: (
      actionParams: EmailActionParams
    ): GenericValidationResult<EmailActionParams> => {
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
        const errorText = i18n.translate(
          'xpack.triggersActionsUI.components.builtinActionTypes.error.requiredEntryText',
          {
            defaultMessage: 'No To, Cc, or Bcc entry.  At least one entry is required.',
          }
        );
        errors.to.push(errorText);
        errors.cc.push(errorText);
        errors.bcc.push(errorText);
      }
      if (!actionParams.message?.length) {
        errors.message.push(
          i18n.translate(
            'xpack.triggersActionsUI.components.builtinActionTypes.error.requiredMessageText',
            {
              defaultMessage: 'Message is required.',
            }
          )
        );
      }
      if (!actionParams.subject?.length) {
        errors.subject.push(
          i18n.translate(
            'xpack.triggersActionsUI.components.builtinActionTypes.error.requiredSubjectText',
            {
              defaultMessage: 'Subject is required.',
            }
          )
        );
      }
      return validationResult;
    },
    actionConnectorFields: lazy(() => import('./email_connector')),
    actionParamsFields: lazy(() => import('./email_params')),
  };
}
