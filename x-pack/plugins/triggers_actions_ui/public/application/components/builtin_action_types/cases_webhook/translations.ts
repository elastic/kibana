/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const CREATE_URL_REQUIRED = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.casesWebhookAction.error.requiredCreateUrlText',
  {
    defaultMessage: 'Create incident URL is required.',
  }
);
export const CREATE_INCIDENT_REQUIRED = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.casesWebhookAction.error.requiredCreateIncidentText',
  {
    defaultMessage: 'Create incident object is required.',
  }
);

export const CREATE_METHOD_REQUIRED = i18n.translate(
  'xpack.triggersActionsUI.sections.addAction.casesWebhookAction.error.requiredCreateMethodText',
  {
    defaultMessage: 'Create incident method is required.',
  }
);

export const CREATE_RESPONSE_KEY_REQUIRED = i18n.translate(
  'xpack.triggersActionsUI.sections.addAction.casesWebhookAction.error.requiredCreateIncidentResponseKeyText',
  {
    defaultMessage: 'Create incident response incident key is required.',
  }
);

export const UPDATE_URL_REQUIRED = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.casesWebhookAction.error.requiredUpdateUrlText',
  {
    defaultMessage: 'Update incident URL is required.',
  }
);
export const UPDATE_INCIDENT_REQUIRED = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.casesWebhookAction.error.requiredUpdateIncidentText',
  {
    defaultMessage: 'Update incident object is required.',
  }
);

export const UPDATE_METHOD_REQUIRED = i18n.translate(
  'xpack.triggersActionsUI.sections.addAction.casesWebhookAction.error.requiredUpdateMethodText',
  {
    defaultMessage: 'Update incident method is required.',
  }
);

export const CREATE_COMMENT_URL_REQUIRED = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.casesWebhookAction.error.requiredCreateCommentUrlText',
  {
    defaultMessage: 'Create comment URL is required.',
  }
);
export const CREATE_COMMENT_INCIDENT_REQUIRED = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.casesWebhookAction.error.requiredCreateCommentIncidentText',
  {
    defaultMessage: 'Create comment object is required.',
  }
);

export const CREATE_COMMENT_METHOD_REQUIRED = i18n.translate(
  'xpack.triggersActionsUI.sections.addAction.casesWebhookAction.error.requiredCreateCommentMethodText',
  {
    defaultMessage: 'Create comment method is required.',
  }
);

export const GET_INCIDENT_URL_REQUIRED = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.casesWebhookAction.error.requiredGetIncidentUrlText',
  {
    defaultMessage: 'Get incident URL is required.',
  }
);
export const GET_RESPONSE_EXTERNAL_TITLE_KEY_REQUIRED = i18n.translate(
  'xpack.triggersActionsUI.sections.addAction.casesWebhookAction.error.requiredGetIncidentResponseExternalTitleKeyText',
  {
    defaultMessage: 'Get incident response external incident title key is re quired.',
  }
);
export const GET_RESPONSE_EXTERNAL_CREATED_KEY_REQUIRED = i18n.translate(
  'xpack.triggersActionsUI.sections.addAction.casesWebhookAction.error.requiredGetIncidentResponseCreatedKeyText',
  {
    defaultMessage: 'Get incident response created date key is required.',
  }
);
export const GET_RESPONSE_EXTERNAL_UPDATED_KEY_REQUIRED = i18n.translate(
  'xpack.triggersActionsUI.sections.addAction.casesWebhookAction.error.requiredGetIncidentResponseUpdatedKeyText',
  {
    defaultMessage: 'Get incident response updated date key is required.',
  }
);
export const GET_INCIDENT_VIEW_URL = i18n.translate(
  'xpack.triggersActionsUI.sections.addAction.casesWebhookAction.error.requiredGetIncidentViewUrlKeyText',
  {
    defaultMessage: 'View incident URL is required.',
  }
);

export const URL_INVALID = (urlType: string) =>
  i18n.translate(
    'xpack.triggersActionsUI.components.builtinActionTypes.casesWebhookAction.error.invalidUrlTextField',
    {
      defaultMessage: '{urlType} URL is invalid.',
      values: {
        urlType,
      },
    }
  );

export const USERNAME_REQUIRED = i18n.translate(
  'xpack.triggersActionsUI.sections.addAction.casesWebhookAction.error.requiredAuthUserNameText',
  {
    defaultMessage: 'Username is required.',
  }
);

export const PASSWORD_REQUIRED = i18n.translate(
  'xpack.triggersActionsUI.sections.addAction.casesWebhookAction.error.requiredAuthPasswordText',
  {
    defaultMessage: 'Password is required.',
  }
);

export const PASSWORD_REQUIRED_FOR_USER = i18n.translate(
  'xpack.triggersActionsUI.sections.addAction.casesWebhookAction.error.requiredPasswordText',
  {
    defaultMessage: 'Password is required when username is used.',
  }
);

export const USERNAME_REQUIRED_FOR_PASSWORD = i18n.translate(
  'xpack.triggersActionsUI.sections.addAction.casesWebhookAction.error.requiredUserText',
  {
    defaultMessage: 'Username is required when password is used.',
  }
);

export const SUMMARY_REQUIRED = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.error.requiredWebhookSummaryText',
  {
    defaultMessage: 'Summary is required.',
  }
);
