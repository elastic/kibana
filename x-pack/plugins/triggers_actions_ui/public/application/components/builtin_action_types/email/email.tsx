/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { lazy } from 'react';
import { i18n } from '@kbn/i18n';
import { ActionTypeModel, ValidationResult } from '../../../../types';
import { EmailActionParams, EmailActionConnector } from '../types';

export function getActionType(): ActionTypeModel<EmailActionConnector, EmailActionParams> {
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
    validateConnector: (action: EmailActionConnector): ValidationResult => {
      const validationResult = { errors: {} };
      const errors = {
        from: new Array<string>(),
        port: new Array<string>(),
        host: new Array<string>(),
        user: new Array<string>(),
        password: new Array<string>(),
      };
      validationResult.errors = errors;
      if (!action.config.from) {
        errors.from.push(
          i18n.translate(
            'xpack.triggersActionsUI.components.builtinActionTypes.error.requiredFromText',
            {
              defaultMessage: 'Sender is required.',
            }
          )
        );
      }
      if (action.config.from && !action.config.from.trim().match(mailformat)) {
        errors.from.push(
          i18n.translate(
            'xpack.triggersActionsUI.components.builtinActionTypes.error.formatFromText',
            {
              defaultMessage: 'Sender is not a valid email address.',
            }
          )
        );
      }
      if (!action.config.port) {
        errors.port.push(
          i18n.translate(
            'xpack.triggersActionsUI.components.builtinActionTypes.error.requiredPortText',
            {
              defaultMessage: 'Port is required.',
            }
          )
        );
      }
      if (!action.config.host) {
        errors.host.push(
          i18n.translate(
            'xpack.triggersActionsUI.components.builtinActionTypes.error.requiredHostText',
            {
              defaultMessage: 'Host is required.',
            }
          )
        );
      }
      if (action.secrets.user && !action.secrets.password) {
        errors.password.push(
          i18n.translate(
            'xpack.triggersActionsUI.components.builtinActionTypes.error.requiredPasswordText',
            {
              defaultMessage: 'Password is required when username is used.',
            }
          )
        );
      }
      if (!action.secrets.user && action.secrets.password) {
        errors.user.push(
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
    validateParams: (actionParams: EmailActionParams): ValidationResult => {
      const validationResult = { errors: {} };
      const errors = {
        to: new Array<string>(),
        cc: new Array<string>(),
        bcc: new Array<string>(),
        message: new Array<string>(),
        subject: new Array<string>(),
      };
      validationResult.errors = errors;
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
