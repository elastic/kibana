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
    defaultMessage: 'Create case URL is required.',
  }
);
export const CREATE_INCIDENT_REQUIRED = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.casesWebhookAction.error.requiredCreateIncidentText',
  {
    defaultMessage: 'Create case object is required and must be valid JSON.',
  }
);

export const CREATE_METHOD_REQUIRED = i18n.translate(
  'xpack.triggersActionsUI.sections.addAction.casesWebhookAction.error.requiredCreateMethodText',
  {
    defaultMessage: 'Create case method is required.',
  }
);

export const CREATE_RESPONSE_KEY_REQUIRED = i18n.translate(
  'xpack.triggersActionsUI.sections.addAction.casesWebhookAction.error.requiredCreateIncidentResponseKeyText',
  {
    defaultMessage: 'Create case response case id key is required.',
  }
);

export const UPDATE_URL_REQUIRED = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.casesWebhookAction.error.requiredUpdateUrlText',
  {
    defaultMessage: 'Update case URL is required.',
  }
);
export const UPDATE_INCIDENT_REQUIRED = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.casesWebhookAction.error.requiredUpdateIncidentText',
  {
    defaultMessage: 'Update case object is required and must be valid JSON.',
  }
);

export const UPDATE_METHOD_REQUIRED = i18n.translate(
  'xpack.triggersActionsUI.sections.addAction.casesWebhookAction.error.requiredUpdateMethodText',
  {
    defaultMessage: 'Update case method is required.',
  }
);

export const CREATE_COMMENT_URL_REQUIRED = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.casesWebhookAction.error.requiredCreateCommentUrlText',
  {
    defaultMessage: 'Create comment URL must be URL format.',
  }
);
export const CREATE_COMMENT_MESSAGE = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.casesWebhookAction.error.requiredCreateCommentIncidentText',
  {
    defaultMessage: 'Create comment object must be valid JSON.',
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
    defaultMessage: 'Get case URL is required.',
  }
);
export const GET_RESPONSE_EXTERNAL_TITLE_KEY_REQUIRED = i18n.translate(
  'xpack.triggersActionsUI.sections.addAction.casesWebhookAction.error.requiredGetIncidentResponseExternalTitleKeyText',
  {
    defaultMessage: 'Get case response external case title key is re quired.',
  }
);
export const GET_RESPONSE_EXTERNAL_CREATED_KEY_REQUIRED = i18n.translate(
  'xpack.triggersActionsUI.sections.addAction.casesWebhookAction.error.requiredGetIncidentResponseCreatedKeyText',
  {
    defaultMessage: 'Get case response created date key is required.',
  }
);
export const GET_RESPONSE_EXTERNAL_UPDATED_KEY_REQUIRED = i18n.translate(
  'xpack.triggersActionsUI.sections.addAction.casesWebhookAction.error.requiredGetIncidentResponseUpdatedKeyText',
  {
    defaultMessage: 'Get case response updated date key is required.',
  }
);
export const GET_INCIDENT_VIEW_URL_REQUIRED = i18n.translate(
  'xpack.triggersActionsUI.sections.addAction.casesWebhookAction.error.requiredGetIncidentViewUrlKeyText',
  {
    defaultMessage: 'View case URL is required.',
  }
);

export const MISSING_VARIABLES = (variables: string[]) =>
  i18n.translate(
    'xpack.triggersActionsUI.components.builtinActionTypes.casesWebhookAction.error.missingVariables',
    {
      defaultMessage:
        'Missing required {variableCount, plural, one {variable} other {variables}}: {variables}',
      values: { variableCount: variables.length, variables: variables.join(', ') },
    }
  );

export const USERNAME_REQUIRED = i18n.translate(
  'xpack.triggersActionsUI.sections.addAction.casesWebhookAction.error.requiredAuthUserNameText',
  {
    defaultMessage: 'Username is required.',
  }
);

export const SUMMARY_REQUIRED = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.error.requiredWebhookSummaryText',
  {
    defaultMessage: 'Title is required.',
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
    defaultMessage: 'Create Case Method',
  }
);

export const CREATE_INCIDENT_URL = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.casesWebhookAction.createIncidentUrlTextFieldLabel',
  {
    defaultMessage: 'Create Case URL',
  }
);

export const CREATE_INCIDENT_JSON = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.casesWebhookAction.createIncidentJsonTextFieldLabel',
  {
    defaultMessage: 'Create Case Object',
  }
);

export const CREATE_INCIDENT_JSON_HELP = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.casesWebhookAction.createIncidentJsonHelpText',
  {
    defaultMessage:
      'JSON object to create case. Use the variable selector to add Cases data to the payload.',
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
    defaultMessage: 'Create Case Response Case Key',
  }
);

export const CREATE_INCIDENT_RESPONSE_KEY_HELP = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.casesWebhookAction.createIncidentResponseKeyHelpText',
  {
    defaultMessage: 'JSON key in create case response that contains the external case id',
  }
);

export const ADD_CASES_VARIABLE = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.casesWebhookAction.addVariable',
  {
    defaultMessage: 'Add variable',
  }
);

export const GET_INCIDENT_URL = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.casesWebhookAction.getIncidentUrlTextFieldLabel',
  {
    defaultMessage: 'Get Case URL',
  }
);
export const GET_INCIDENT_URL_HELP = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.casesWebhookAction.getIncidentUrlHelp',
  {
    defaultMessage:
      'API URL to GET case details JSON from external system. Use the variable selector to add external system id to the url.',
  }
);

export const GET_INCIDENT_TITLE_KEY = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.casesWebhookAction.getIncidentResponseExternalTitleKeyTextFieldLabel',
  {
    defaultMessage: 'Get Case Response External Title Key',
  }
);
export const GET_INCIDENT_TITLE_KEY_HELP = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.casesWebhookAction.getIncidentResponseExternalTitleKeyHelp',
  {
    defaultMessage: 'JSON key in get case response that contains the external case title',
  }
);

export const EXTERNAL_INCIDENT_VIEW_URL = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.casesWebhookAction.viewIncidentUrlTextFieldLabel',
  {
    defaultMessage: 'External Case View URL',
  }
);
export const EXTERNAL_INCIDENT_VIEW_URL_HELP = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.casesWebhookAction.viewIncidentUrlHelp',
  {
    defaultMessage:
      'URL to view case in external system. Use the variable selector to add external system id or external system title to the url.',
  }
);

export const UPDATE_INCIDENT_METHOD = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.casesWebhookAction.updateIncidentMethodTextFieldLabel',
  {
    defaultMessage: 'Update Case Method',
  }
);

export const UPDATE_INCIDENT_URL = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.casesWebhookAction.updateIncidentUrlTextFieldLabel',
  {
    defaultMessage: 'Update Case URL',
  }
);
export const UPDATE_INCIDENT_URL_HELP = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.casesWebhookAction.updateIncidentUrlHelp',
  {
    defaultMessage: 'API URL to update case.',
  }
);

export const UPDATE_INCIDENT_JSON = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.casesWebhookAction.updateIncidentJsonTextFieldLabel',
  {
    defaultMessage: 'Update Case Object',
  }
);
export const UPDATE_INCIDENT_JSON_HELP = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.casesWebhookAction.updateIncidentJsonHelpl',
  {
    defaultMessage:
      'JSON object to update case. Use the variable selector to add Cases data to the payload.',
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
    defaultMessage: 'API URL to add comment to case.',
  }
);

export const CREATE_COMMENT_JSON = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.casesWebhookAction.createCommentJsonTextFieldLabel',
  {
    defaultMessage: 'Create Comment Object',
  }
);
export const CREATE_COMMENT_JSON_HELP = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.casesWebhookAction.createCommentJsonHelp',
  {
    defaultMessage:
      'JSON object to create a comment. Use the variable selector to add Cases data to the payload.',
  }
);

export const HAS_AUTH = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.casesWebhookAction.hasAuthSwitchLabel',
  {
    defaultMessage: 'Require authentication for this webhook',
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

export const STEP_1 = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.casesWebhookAction.step1',
  {
    defaultMessage: 'Set up connector',
  }
);

export const STEP_2 = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.casesWebhookAction.step2',
  {
    defaultMessage: 'Create case',
  }
);

export const STEP_2_DESCRIPTION = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.casesWebhookAction.step2Description',
  {
    defaultMessage:
      'Set fields to create the case in the external system. Check your service’s API documentation to understand what fields are required',
  }
);

export const STEP_3 = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.casesWebhookAction.step3',
  {
    defaultMessage: 'Get case information',
  }
);

export const STEP_3_DESCRIPTION = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.casesWebhookAction.step3Description',
  {
    defaultMessage:
      'Set fields to add comments to the case in external system. For some systems, this may be the same method as creating updates in cases. Check your service’s API documentation to understand what fields are required.',
  }
);

export const STEP_4 = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.casesWebhookAction.step4',
  {
    defaultMessage: 'Comments and updates',
  }
);

export const STEP_4A = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.casesWebhookAction.step4a',
  {
    defaultMessage: 'Create update in case',
  }
);

export const STEP_4A_DESCRIPTION = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.casesWebhookAction.step4aDescription',
  {
    defaultMessage:
      'Set fields to create updates to the case in external system. For some systems, this may be the same method as adding comments to cases.',
  }
);

export const STEP_4B = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.casesWebhookAction.step4b',
  {
    defaultMessage: 'Add comment in case',
  }
);

export const STEP_4B_DESCRIPTION = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.casesWebhookAction.step4bDescription',
  {
    defaultMessage:
      'Set fields to add comments to the case in external system. For some systems, this may be the same method as creating updates in cases.',
  }
);

export const NEXT = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.casesWebhookAction.next',
  {
    defaultMessage: 'Next',
  }
);

export const PREVIOUS = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.casesWebhookAction.previous',
  {
    defaultMessage: 'Previous',
  }
);

export const CASE_TITLE_DESC = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.casesWebhookAction.caseTitleDesc',
  {
    defaultMessage: 'Kibana case title',
  }
);

export const CASE_DESCRIPTION_DESC = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.casesWebhookAction.caseDescriptionDesc',
  {
    defaultMessage: 'Kibana case description',
  }
);

export const CASE_TAGS_DESC = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.casesWebhookAction.caseTagsDesc',
  {
    defaultMessage: 'Kibana case tags',
  }
);

export const CASE_COMMENT_DESC = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.casesWebhookAction.caseCommentDesc',
  {
    defaultMessage: 'Kibana case comment',
  }
);

export const EXTERNAL_ID_DESC = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.casesWebhookAction.externalIdDesc',
  {
    defaultMessage: 'External system id',
  }
);

export const EXTERNAL_TITLE_DESC = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.casesWebhookAction.externalTitleDesc',
  {
    defaultMessage: 'External system title',
  }
);

export const DOC_LINK = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.casesWebhookAction.docLink',
  {
    defaultMessage: 'Configuring Webhook - Case Management connector.',
  }
);
