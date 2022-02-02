/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const URL_REQUIRED = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.xmattersAction.error.requiredUrlText',
  {
    defaultMessage: 'URL is required.',
  }
);

export const URL_INVALID = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.xmattersAction.error.invalidUrlTextField',
  {
    defaultMessage: 'URL is invalid.',
  }
);

export const USERNAME_REQUIRED = i18n.translate(
  'xpack.triggersActionsUI.sections.addAction.xmattersAction.error.requiredAuthUserNameText',
  {
    defaultMessage: 'Username is required.',
  }
);

export const PASSWORD_REQUIRED = i18n.translate(
  'xpack.triggersActionsUI.sections.addAction.xmattersAction.error.requiredAuthPasswordText',
  {
    defaultMessage: 'Password is required.',
  }
);

export const PASSWORD_REQUIRED_FOR_USER = i18n.translate(
  'xpack.triggersActionsUI.sections.addAction.xmattersAction.error.requiredPasswordText',
  {
    defaultMessage: 'Password is required when username is used.',
  }
);

export const USERNAME_REQUIRED_FOR_PASSWORD = i18n.translate(
  'xpack.triggersActionsUI.sections.addAction.xmattersAction.error.requiredUserText',
  {
    defaultMessage: 'Username is required when password is used.',
  }
);
