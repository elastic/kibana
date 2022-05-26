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

export const KEY_REQUIRED = i18n.translate(
  'xpack.triggersActionsUI.sections.addAction.casesWebhookAction.error.requiredHeaderKeyText',
  {
    defaultMessage: 'Key is required.',
  }
);

export const VALUE_REQUIRED = i18n.translate(
  'xpack.triggersActionsUI.sections.addAction.casesWebhookAction.error.requiredHeaderValueText',
  {
    defaultMessage: 'Value is required.',
  }
);

export const ADD_HEADER = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.casesWebhookAction.addHeader',
  {
    defaultMessage: 'Add header',
  }
);

export const KEY_LABEL = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.casesWebhookAction.keyTextFieldLabel',
  {
    defaultMessage: 'Key',
  }
);

export const VALUE_LABEL = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.casesWebhookAction.valueTextFieldLabel',
  {
    defaultMessage: 'Value',
  }
);

export const ADD_BUTTON = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.casesWebhookAction.addHeaderButton',
  {
    defaultMessage: 'Add',
  }
);

export const DELETE_BUTTON = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.casesWebhookAction.deleteHeaderButton',
  {
    defaultMessage: 'Delete',
    description: 'Delete HTTP header',
  }
);

export const CREATE_INCIDENT_METHOD = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.casesWebhookAction.createIncidentMethodTextFieldLabel',
  {
    defaultMessage: 'Create Incident Method',
  }
);

export const CREATE_INCIDENT_URL = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.casesWebhookAction.createIncidentUrlTextFieldLabel',
  {
    defaultMessage: 'Create Incident URL',
  }
);

export const CREATE_INCIDENT_JSON = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.casesWebhookAction.createIncidentJsonTextFieldLabel',
  {
    defaultMessage: 'Create Incident JSON',
  }
);

export const CREATE_INCIDENT_JSON_HELP = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.casesWebhookAction.createIncidentJsonHelpText',
  {
    defaultMessage:
      'JSON object to create incident. Sub $SUM where the summary/title should go, $DESC where the description should go, and $TAGS where tags should go (optional).',
  }
);

export const JSON = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.casesWebhookAction.jsonFieldLabel',
  {
    defaultMessage: 'JSON',
  }
);
export const CODE_EDITOR = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.casesWebhookAction.jsonCodeEditorAriaLabel',
  {
    defaultMessage: 'Code editor',
  }
);

export const CREATE_INCIDENT_RESPONSE_KEY = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.casesWebhookAction.createIncidentResponseKeyTextFieldLabel',
  {
    defaultMessage: 'Create Incident Response Incident Key',
  }
);

export const CREATE_INCIDENT_RESPONSE_KEY_HELP = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.casesWebhookAction.createIncidentResponseKeyHelpText',
  {
    defaultMessage: 'JSON key in create incident response that contains the external incident id',
  }
);

export const GET_INCIDENT_URL = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.casesWebhookAction.getIncidentUrlTextFieldLabel',
  {
    defaultMessage: 'Get Incident URL',
  }
);
export const GET_INCIDENT_URL_HELP = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.casesWebhookAction.getIncidentUrlHelp',
  {
    defaultMessage:
      'API URL to GET incident details JSON from external system. Use $ID and Kibana will dynamically update the url with the external incident id.',
  }
);

export const GET_INCIDENT_TITLE_KEY = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.casesWebhookAction.getIncidentResponseExternalTitleKeyTextFieldLabel',
  {
    defaultMessage: 'Get Incident Response External Title Key',
  }
);
export const GET_INCIDENT_TITLE_KEY_HELP = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.casesWebhookAction.getIncidentResponseExternalTitleKeyHelp',
  {
    defaultMessage: 'JSON key in get incident response that contains the external incident title',
  }
);

export const GET_INCIDENT_CREATED_KEY = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.casesWebhookAction.getIncidentResponseCreatedDateKeyTextFieldLabel',
  {
    defaultMessage: 'Get Incident Response Created Date Key',
  }
);
export const GET_INCIDENT_CREATED_KEY_HELP = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.casesWebhookAction.getIncidentResponseCreatedDateKeyHelp',
  {
    defaultMessage:
      'JSON key in get incident response that contains the date the incident was created.',
  }
);

export const GET_INCIDENT_UPDATED_KEY = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.casesWebhookAction.getIncidentResponseUpdatedDateKeyTextFieldLabel',
  {
    defaultMessage: 'Get Incident Response Updated Date Key',
  }
);
export const GET_INCIDENT_UPDATED_KEY_HELP = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.casesWebhookAction.getIncidentResponseUpdatedDateKeyHelp',
  {
    defaultMessage:
      'JSON key in get incident response that contains the date the incident was updated.',
  }
);

export const EXTERNAL_INCIDENT_VIEW_URL = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.casesWebhookAction.incidentViewUrlTextFieldLabel',
  {
    defaultMessage: 'External Incident View URL',
  }
);
export const EXTERNAL_INCIDENT_VIEW_URL_HELP = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.casesWebhookAction.incidentViewUrlHelp',
  {
    defaultMessage:
      'URL to view incident in external system. Use $ID or $TITLE and Kibana will dynamically update the url with the external incident id or external incident title.',
  }
);

export const UPDATE_INCIDENT_METHOD = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.casesWebhookAction.updateIncidentMethodTextFieldLabel',
  {
    defaultMessage: 'Update Incident Method',
  }
);

export const UPDATE_INCIDENT_URL = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.casesWebhookAction.updateIncidentUrlTextFieldLabel',
  {
    defaultMessage: 'Update Incident URL',
  }
);
export const UPDATE_INCIDENT_URL_HELP = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.casesWebhookAction.updateIncidentUrlHelp',
  {
    defaultMessage:
      'API URL to update incident. Use $ID and Kibana will dynamically update the url with the external incident id.',
  }
);

export const UPDATE_INCIDENT_JSON = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.casesWebhookAction.updateIncidentJsonTextFieldLabel',
  {
    defaultMessage: 'Update Incident JSON',
  }
);
export const UPDATE_INCIDENT_JSON_HELP = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.casesWebhookAction.updateIncidentJsonHelpl',
  {
    defaultMessage:
      'JSON object to update incident. Sub $SUM where the summary/title should go, $DESC where the description should go, and $TAGS where tags should go (optional).',
  }
);

export const CREATE_COMMENT_METHOD = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.casesWebhookAction.createCommentMethodTextFieldLabel',
  {
    defaultMessage: 'Create Comment Method',
  }
);
export const CREATE_COMMENT_URL = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.casesWebhookAction.createCommentUrlTextFieldLabel',
  {
    defaultMessage: 'Create Comment URL',
  }
);

export const CREATE_COMMENT_URL_HELP = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.casesWebhookAction.createCommentUrlHelp',
  {
    defaultMessage:
      'API URL to add comment to incident. Use $ID and Kibana will dynamically update the url with the external incident id.',
  }
);

export const CREATE_COMMENT_JSON = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.casesWebhookAction.createCommentJsonTextFieldLabel',
  {
    defaultMessage: 'Create Comment JSON',
  }
);
export const CREATE_COMMENT_JSON_HELP = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.casesWebhookAction.createCommentJsonHelp',
  {
    defaultMessage: 'JSON object to update incident. Sub $COMMENT where the comment should go',
  }
);

export const HAS_AUTH = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.casesWebhookAction.hasAuthSwitchLabel',
  {
    defaultMessage: 'Require authentication for this webhook',
  }
);

export const REENTER_VALUES = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.casesWebhookAction.reenterValuesLabel',
  {
    defaultMessage: 'Username and password are encrypted. Please reenter values for these fields.',
  }
);

export const USERNAME = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.casesWebhookAction.userTextFieldLabel',
  {
    defaultMessage: 'Username',
  }
);

export const PASSWORD = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.casesWebhookAction.passwordTextFieldLabel',
  {
    defaultMessage: 'Password',
  }
);

export const HEADERS_SWITCH = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.casesWebhookAction.viewHeadersSwitch',
  {
    defaultMessage: 'Add HTTP header',
  }
);

export const HEADERS_TITLE = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.casesWebhookAction.httpHeadersTitle',
  {
    defaultMessage: 'Headers in use',
  }
);

export const AUTH_TITLE = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.casesWebhookAction.authenticationLabel',
  {
    defaultMessage: 'Authentication',
  }
);
