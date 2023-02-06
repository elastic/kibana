/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const CREATE_URL_REQUIRED = i18n.translate(
  'xpack.stackConnectors.components.casesWebhook.error.requiredCreateUrlText',
  {
    defaultMessage: 'Create case URL is required.',
  }
);
export const CREATE_INCIDENT_REQUIRED = i18n.translate(
  'xpack.stackConnectors.components.casesWebhook.error.requiredCreateIncidentText',
  {
    defaultMessage: 'Create case object is required and must be valid JSON.',
  }
);

export const CREATE_METHOD_REQUIRED = i18n.translate(
  'xpack.stackConnectors.components.casesWebhook.error.requiredCreateMethodText',
  {
    defaultMessage: 'Create case method is required.',
  }
);

export const CREATE_RESPONSE_KEY_REQUIRED = i18n.translate(
  'xpack.stackConnectors.components.casesWebhook.error.requiredCreateIncidentResponseKeyText',
  {
    defaultMessage: 'Create case response case id key is required.',
  }
);

export const UPDATE_URL_REQUIRED = i18n.translate(
  'xpack.stackConnectors.components.casesWebhook.error.requiredUpdateUrlText',
  {
    defaultMessage: 'Update case URL is required.',
  }
);
export const UPDATE_INCIDENT_REQUIRED = i18n.translate(
  'xpack.stackConnectors.components.casesWebhook.error.requiredUpdateIncidentText',
  {
    defaultMessage: 'Update case object is required and must be valid JSON.',
  }
);

export const UPDATE_METHOD_REQUIRED = i18n.translate(
  'xpack.stackConnectors.components.casesWebhook.error.requiredUpdateMethodText',
  {
    defaultMessage: 'Update case method is required.',
  }
);

export const CREATE_COMMENT_URL_REQUIRED = i18n.translate(
  'xpack.stackConnectors.components.casesWebhook.error.requiredCreateCommentUrlText',
  {
    defaultMessage: 'Create comment URL must be URL format.',
  }
);
export const CREATE_COMMENT_MESSAGE = i18n.translate(
  'xpack.stackConnectors.components.casesWebhook.error.requiredCreateCommentIncidentText',
  {
    defaultMessage: 'Create comment object must be valid JSON.',
  }
);

export const CREATE_COMMENT_METHOD_REQUIRED = i18n.translate(
  'xpack.stackConnectors.components.casesWebhook.error.requiredCreateCommentMethodText',
  {
    defaultMessage: 'Create comment method is required.',
  }
);

export const GET_INCIDENT_URL_REQUIRED = i18n.translate(
  'xpack.stackConnectors.components.casesWebhook.error.requiredGetIncidentUrlText',
  {
    defaultMessage: 'Get case URL is required.',
  }
);
export const GET_RESPONSE_EXTERNAL_TITLE_KEY_REQUIRED = i18n.translate(
  'xpack.stackConnectors.components.casesWebhook.error.requiredGetIncidentResponseExternalTitleKeyText',
  {
    defaultMessage: 'Get case response external case title key is re quired.',
  }
);
export const GET_RESPONSE_EXTERNAL_CREATED_KEY_REQUIRED = i18n.translate(
  'xpack.stackConnectors.components.casesWebhook.error.requiredGetIncidentResponseCreatedKeyText',
  {
    defaultMessage: 'Get case response created date key is required.',
  }
);
export const GET_RESPONSE_EXTERNAL_UPDATED_KEY_REQUIRED = i18n.translate(
  'xpack.stackConnectors.components.casesWebhook.error.requiredGetIncidentResponseUpdatedKeyText',
  {
    defaultMessage: 'Get case response updated date key is required.',
  }
);
export const GET_INCIDENT_VIEW_URL_REQUIRED = i18n.translate(
  'xpack.stackConnectors.components.casesWebhook.error.requiredGetIncidentViewUrlKeyText',
  {
    defaultMessage: 'View case URL is required.',
  }
);

export const MISSING_VARIABLES = (variables: string[]) =>
  i18n.translate('xpack.stackConnectors.components.casesWebhook.error.missingVariables', {
    defaultMessage:
      'Missing required {variableCount, plural, one {variable} other {variables}}: {variables}',
    values: { variableCount: variables.length, variables: variables.join(', ') },
  });

export const USERNAME_REQUIRED = i18n.translate(
  'xpack.stackConnectors.components.casesWebhook.error.requiredAuthUserNameText',
  {
    defaultMessage: 'Username is required.',
  }
);

export const SUMMARY_REQUIRED = i18n.translate(
  'xpack.stackConnectors.components.casesWebhook.error.requiredWebhookSummaryText',
  {
    defaultMessage: 'Title is required.',
  }
);

export const KEY_LABEL = i18n.translate(
  'xpack.stackConnectors.components.casesWebhook.keyTextFieldLabel',
  {
    defaultMessage: 'Key',
  }
);

export const VALUE_LABEL = i18n.translate(
  'xpack.stackConnectors.components.casesWebhook.valueTextFieldLabel',
  {
    defaultMessage: 'Value',
  }
);

export const ADD_BUTTON = i18n.translate(
  'xpack.stackConnectors.components.casesWebhook.addHeaderButton',
  {
    defaultMessage: 'Add',
  }
);

export const DELETE_BUTTON = i18n.translate(
  'xpack.stackConnectors.components.casesWebhook.deleteHeaderButton',
  {
    defaultMessage: 'Delete',
    description: 'Delete HTTP header',
  }
);

export const CREATE_INCIDENT_METHOD = i18n.translate(
  'xpack.stackConnectors.components.casesWebhook.createIncidentMethodTextFieldLabel',
  {
    defaultMessage: 'Create Case Method',
  }
);

export const CREATE_INCIDENT_URL = i18n.translate(
  'xpack.stackConnectors.components.casesWebhook.createIncidentUrlTextFieldLabel',
  {
    defaultMessage: 'Create Case URL',
  }
);

export const CREATE_INCIDENT_JSON = i18n.translate(
  'xpack.stackConnectors.components.casesWebhook.createIncidentJsonTextFieldLabel',
  {
    defaultMessage: 'Create Case Object',
  }
);

export const CREATE_INCIDENT_JSON_HELP = i18n.translate(
  'xpack.stackConnectors.components.casesWebhook.createIncidentJsonHelpText',
  {
    defaultMessage:
      'JSON object to create case. Use the variable selector to add Cases data to the payload.',
  }
);

export const JSON = i18n.translate('xpack.stackConnectors.components.casesWebhook.jsonFieldLabel', {
  defaultMessage: 'JSON',
});
export const CODE_EDITOR = i18n.translate(
  'xpack.stackConnectors.components.casesWebhook.jsonCodeEditorAriaLabel',
  {
    defaultMessage: 'Code editor',
  }
);

export const CREATE_INCIDENT_RESPONSE_KEY = i18n.translate(
  'xpack.stackConnectors.components.casesWebhook.createIncidentResponseKeyTextFieldLabel',
  {
    defaultMessage: 'Create Case Response Case Key',
  }
);

export const CREATE_INCIDENT_RESPONSE_KEY_HELP = i18n.translate(
  'xpack.stackConnectors.components.casesWebhook.createIncidentResponseKeyHelpText',
  {
    defaultMessage: 'JSON key in create case response that contains the external case id',
  }
);

export const ADD_CASES_VARIABLE = i18n.translate(
  'xpack.stackConnectors.components.casesWebhook.addVariable',
  {
    defaultMessage: 'Add variable',
  }
);

export const GET_INCIDENT_URL = i18n.translate(
  'xpack.stackConnectors.components.casesWebhook.getIncidentUrlTextFieldLabel',
  {
    defaultMessage: 'Get Case URL',
  }
);
export const GET_INCIDENT_URL_HELP = i18n.translate(
  'xpack.stackConnectors.components.casesWebhook.getIncidentUrlHelp',
  {
    defaultMessage:
      'API URL to GET case details JSON from external system. Use the variable selector to add external system id to the url.',
  }
);

export const GET_INCIDENT_TITLE_KEY = i18n.translate(
  'xpack.stackConnectors.components.casesWebhook.getIncidentResponseExternalTitleKeyTextFieldLabel',
  {
    defaultMessage: 'Get Case Response External Title Key',
  }
);
export const GET_INCIDENT_TITLE_KEY_HELP = i18n.translate(
  'xpack.stackConnectors.components.casesWebhook.getIncidentResponseExternalTitleKeyHelp',
  {
    defaultMessage: 'JSON key in get case response that contains the external case title',
  }
);

export const EXTERNAL_INCIDENT_VIEW_URL = i18n.translate(
  'xpack.stackConnectors.components.casesWebhook.viewIncidentUrlTextFieldLabel',
  {
    defaultMessage: 'External Case View URL',
  }
);
export const EXTERNAL_INCIDENT_VIEW_URL_HELP = i18n.translate(
  'xpack.stackConnectors.components.casesWebhook.viewIncidentUrlHelp',
  {
    defaultMessage:
      'URL to view case in external system. Use the variable selector to add external system id or external system title to the url.',
  }
);

export const UPDATE_INCIDENT_METHOD = i18n.translate(
  'xpack.stackConnectors.components.casesWebhook.updateIncidentMethodTextFieldLabel',
  {
    defaultMessage: 'Update Case Method',
  }
);

export const UPDATE_INCIDENT_URL = i18n.translate(
  'xpack.stackConnectors.components.casesWebhook.updateIncidentUrlTextFieldLabel',
  {
    defaultMessage: 'Update Case URL',
  }
);
export const UPDATE_INCIDENT_URL_HELP = i18n.translate(
  'xpack.stackConnectors.components.casesWebhook.updateIncidentUrlHelp',
  {
    defaultMessage: 'API URL to update case.',
  }
);

export const UPDATE_INCIDENT_JSON = i18n.translate(
  'xpack.stackConnectors.components.casesWebhook.updateIncidentJsonTextFieldLabel',
  {
    defaultMessage: 'Update Case Object',
  }
);
export const UPDATE_INCIDENT_JSON_HELP = i18n.translate(
  'xpack.stackConnectors.components.casesWebhook.updateIncidentJsonHelpl',
  {
    defaultMessage:
      'JSON object to update case. Use the variable selector to add Cases data to the payload.',
  }
);

export const CREATE_COMMENT_METHOD = i18n.translate(
  'xpack.stackConnectors.components.casesWebhook.createCommentMethodTextFieldLabel',
  {
    defaultMessage: 'Create Comment Method',
  }
);
export const CREATE_COMMENT_URL = i18n.translate(
  'xpack.stackConnectors.components.casesWebhook.createCommentUrlTextFieldLabel',
  {
    defaultMessage: 'Create Comment URL',
  }
);

export const CREATE_COMMENT_URL_HELP = i18n.translate(
  'xpack.stackConnectors.components.casesWebhook.createCommentUrlHelp',
  {
    defaultMessage: 'API URL to add comment to case.',
  }
);

export const CREATE_COMMENT_JSON = i18n.translate(
  'xpack.stackConnectors.components.casesWebhook.createCommentJsonTextFieldLabel',
  {
    defaultMessage: 'Create Comment Object',
  }
);
export const CREATE_COMMENT_JSON_HELP = i18n.translate(
  'xpack.stackConnectors.components.casesWebhook.createCommentJsonHelp',
  {
    defaultMessage:
      'JSON object to create a comment. Use the variable selector to add Cases data to the payload.',
  }
);

export const HAS_AUTH = i18n.translate(
  'xpack.stackConnectors.components.casesWebhook.hasAuthSwitchLabel',
  {
    defaultMessage: 'Require authentication for this webhook',
  }
);

export const USERNAME = i18n.translate(
  'xpack.stackConnectors.components.casesWebhook.userTextFieldLabel',
  {
    defaultMessage: 'Username',
  }
);

export const PASSWORD = i18n.translate(
  'xpack.stackConnectors.components.casesWebhook.passwordTextFieldLabel',
  {
    defaultMessage: 'Password',
  }
);

export const HEADERS_SWITCH = i18n.translate(
  'xpack.stackConnectors.components.casesWebhook.viewHeadersSwitch',
  {
    defaultMessage: 'Add HTTP header',
  }
);

export const HEADERS_TITLE = i18n.translate(
  'xpack.stackConnectors.components.casesWebhook.httpHeadersTitle',
  {
    defaultMessage: 'Headers in use',
  }
);

export const AUTH_TITLE = i18n.translate(
  'xpack.stackConnectors.components.casesWebhook.authenticationLabel',
  {
    defaultMessage: 'Authentication',
  }
);

export const STEP_1 = i18n.translate('xpack.stackConnectors.components.casesWebhook.step1', {
  defaultMessage: 'Set up connector',
});

export const STEP_2 = i18n.translate('xpack.stackConnectors.components.casesWebhook.step2', {
  defaultMessage: 'Create case',
});

export const STEP_2_DESCRIPTION = i18n.translate(
  'xpack.stackConnectors.components.casesWebhook.step2Description',
  {
    defaultMessage:
      'Set fields to create the case in the external system. Check your service’s API documentation to understand what fields are required',
  }
);

export const STEP_3 = i18n.translate('xpack.stackConnectors.components.casesWebhook.step3', {
  defaultMessage: 'Get case information',
});

export const STEP_3_DESCRIPTION = i18n.translate(
  'xpack.stackConnectors.components.casesWebhook.step3Description',
  {
    defaultMessage:
      'Set fields to add comments to the case in external system. For some systems, this may be the same method as creating updates in cases. Check your service’s API documentation to understand what fields are required.',
  }
);

export const STEP_4 = i18n.translate('xpack.stackConnectors.components.casesWebhook.step4', {
  defaultMessage: 'Comments and updates',
});

export const STEP_4A = i18n.translate('xpack.stackConnectors.components.casesWebhook.step4a', {
  defaultMessage: 'Create update in case',
});

export const STEP_4A_DESCRIPTION = i18n.translate(
  'xpack.stackConnectors.components.casesWebhook.step4aDescription',
  {
    defaultMessage:
      'Set fields to create updates to the case in external system. For some systems, this may be the same method as adding comments to cases.',
  }
);

export const STEP_4B = i18n.translate('xpack.stackConnectors.components.casesWebhook.step4b', {
  defaultMessage: 'Add comment in case',
});

export const STEP_4B_DESCRIPTION = i18n.translate(
  'xpack.stackConnectors.components.casesWebhook.step4bDescription',
  {
    defaultMessage:
      'Set fields to add comments to the case in external system. For some systems, this may be the same method as creating updates in cases.',
  }
);

export const NEXT = i18n.translate('xpack.stackConnectors.components.casesWebhook.next', {
  defaultMessage: 'Next',
});

export const PREVIOUS = i18n.translate('xpack.stackConnectors.components.casesWebhook.previous', {
  defaultMessage: 'Previous',
});

export const CASE_TITLE_DESC = i18n.translate(
  'xpack.stackConnectors.components.casesWebhook.caseTitleDesc',
  {
    defaultMessage: 'Kibana case title',
  }
);

export const CASE_DESCRIPTION_DESC = i18n.translate(
  'xpack.stackConnectors.components.casesWebhook.caseDescriptionDesc',
  {
    defaultMessage: 'Kibana case description',
  }
);

export const CASE_TAGS_DESC = i18n.translate(
  'xpack.stackConnectors.components.casesWebhook.caseTagsDesc',
  {
    defaultMessage: 'Kibana case tags',
  }
);

export const CASE_COMMENT_DESC = i18n.translate(
  'xpack.stackConnectors.components.casesWebhook.caseCommentDesc',
  {
    defaultMessage: 'Kibana case comment',
  }
);

export const EXTERNAL_ID_DESC = i18n.translate(
  'xpack.stackConnectors.components.casesWebhook.externalIdDesc',
  {
    defaultMessage: 'External system id',
  }
);

export const EXTERNAL_TITLE_DESC = i18n.translate(
  'xpack.stackConnectors.components.casesWebhook.externalTitleDesc',
  {
    defaultMessage: 'External system title',
  }
);

export const DOC_LINK = i18n.translate('xpack.stackConnectors.components.casesWebhook.docLink', {
  defaultMessage: 'Configuring Webhook - Case Management connector.',
});
