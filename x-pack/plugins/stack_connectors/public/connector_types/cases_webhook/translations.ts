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

export const CREATE_COMMENT_URL_FORMAT_REQUIRED = i18n.translate(
  'xpack.stackConnectors.components.casesWebhook.error.requiredCreateCommentUrlText',
  {
    defaultMessage: 'Create comment URL must be URL format.',
  }
);

export const CREATE_COMMENT_URL_MISSING = i18n.translate(
  'xpack.stackConnectors.components.casesWebhook.error.requiredCreateCommentUrlMissing',
  {
    defaultMessage: 'Create comment URL is required.',
  }
);

export const CREATE_COMMENT_JSON_MISSING = i18n.translate(
  'xpack.stackConnectors.components.casesWebhook.error.requiredCreateCommentJsonMissing',
  {
    defaultMessage: 'Create comment Json is required.',
  }
);

export const CREATE_COMMENT_FORMAT_MESSAGE = i18n.translate(
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
    defaultMessage: 'Get case response external case title key is required.',
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

export const SUMMARY_REQUIRED = i18n.translate(
  'xpack.stackConnectors.components.casesWebhook.error.requiredWebhookSummaryText',
  {
    defaultMessage: 'Title is required.',
  }
);

export const CREATE_INCIDENT_METHOD = i18n.translate(
  'xpack.stackConnectors.components.casesWebhook.createIncidentMethodTextFieldLabel',
  {
    defaultMessage: 'Create case method',
  }
);

export const CREATE_INCIDENT_URL = i18n.translate(
  'xpack.stackConnectors.components.casesWebhook.createIncidentUrlTextFieldLabel',
  {
    defaultMessage: 'Create case URL',
  }
);

export const CREATE_INCIDENT_JSON = i18n.translate(
  'xpack.stackConnectors.components.casesWebhook.createIncidentJsonTextFieldLabel',
  {
    defaultMessage: 'Create case object',
  }
);

export const CREATE_INCIDENT_JSON_HELP = i18n.translate(
  'xpack.stackConnectors.components.casesWebhook.createIncidentJsonHelpText',
  {
    defaultMessage:
      'JSON object to create a case. Use the variable selector to add cases data to the payload.',
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
    defaultMessage: 'Create case response external key',
  }
);

export const CREATE_INCIDENT_RESPONSE_KEY_HELP = i18n.translate(
  'xpack.stackConnectors.components.casesWebhook.createIncidentResponseKeyHelpText',
  {
    defaultMessage: 'JSON key in the create external case response that contains the case ID',
  }
);

export const ADD_CASES_VARIABLE = i18n.translate(
  'xpack.stackConnectors.components.casesWebhook.addVariable',
  {
    defaultMessage: 'Add variable',
  }
);
export const GET_INCIDENT_METHOD = i18n.translate(
  'xpack.stackConnectors.components.casesWebhook.getIncidentMethodTextFieldLabel',
  {
    defaultMessage: 'Get case method',
  }
);
export const GET_INCIDENT_URL = i18n.translate(
  'xpack.stackConnectors.components.casesWebhook.getIncidentUrlTextFieldLabel',
  {
    defaultMessage: 'Get case URL',
  }
);
export const GET_METHOD_REQUIRED = i18n.translate(
  'xpack.stackConnectors.components.casesWebhook.error.requiredGetMethodText',
  {
    defaultMessage: 'Get case method is required.',
  }
);
export const GET_INCIDENT_URL_HELP = i18n.translate(
  'xpack.stackConnectors.components.casesWebhook.getIncidentUrlHelp',
  {
    defaultMessage:
      'API URL to get case details in JSON format from the external system. Use the variable selector to add the external system ID to the URL.',
  }
);

export const GET_INCIDENT_TITLE_KEY = i18n.translate(
  'xpack.stackConnectors.components.casesWebhook.getIncidentResponseExternalTitleKeyTextFieldLabel',
  {
    defaultMessage: 'Get case response external title key',
  }
);
export const GET_INCIDENT_TITLE_KEY_HELP = i18n.translate(
  'xpack.stackConnectors.components.casesWebhook.getIncidentResponseExternalTitleKeyHelp',
  {
    defaultMessage: 'JSON key in the get external case response that contains the case title',
  }
);

export const GET_INCIDENT_JSON_HELP = i18n.translate(
  'xpack.stackConnectors.components.casesWebhook.getIncidentJsonHelp',
  {
    defaultMessage:
      'JSON object to get a case. Use the variable selector to add cases data to the payload.',
  }
);

export const GET_INCIDENT_JSON = i18n.translate(
  'xpack.stackConnectors.components.casesWebhook.getIncidentJsonTextFieldLabel',
  {
    defaultMessage: 'Get case object',
  }
);

export const GET_INCIDENT_REQUIRED = i18n.translate(
  'xpack.stackConnectors.components.casesWebhook.error.requiredGetIncidentText',
  {
    defaultMessage: 'Get case object is required and must be valid JSON.',
  }
);

export const EXTERNAL_INCIDENT_VIEW_URL = i18n.translate(
  'xpack.stackConnectors.components.casesWebhook.viewIncidentUrlTextFieldLabel',
  {
    defaultMessage: 'External case view URL',
  }
);
export const EXTERNAL_INCIDENT_VIEW_URL_HELP = i18n.translate(
  'xpack.stackConnectors.components.casesWebhook.viewIncidentUrlHelp',
  {
    defaultMessage:
      'URL to view a case in the external system. Use the variable selector to add external system ID or external system title to the URL.',
  }
);

export const UPDATE_INCIDENT_METHOD = i18n.translate(
  'xpack.stackConnectors.components.casesWebhook.updateIncidentMethodTextFieldLabel',
  {
    defaultMessage: 'Update case method',
  }
);

export const UPDATE_INCIDENT_URL = i18n.translate(
  'xpack.stackConnectors.components.casesWebhook.updateIncidentUrlTextFieldLabel',
  {
    defaultMessage: 'Update case URL',
  }
);
export const UPDATE_INCIDENT_URL_HELP = i18n.translate(
  'xpack.stackConnectors.components.casesWebhook.updateIncidentUrlHelp',
  {
    defaultMessage: 'API URL to update a case.',
  }
);

export const UPDATE_INCIDENT_JSON = i18n.translate(
  'xpack.stackConnectors.components.casesWebhook.updateIncidentJsonTextFieldLabel',
  {
    defaultMessage: 'Update case object',
  }
);
export const UPDATE_INCIDENT_JSON_HELP = i18n.translate(
  'xpack.stackConnectors.components.casesWebhook.updateIncidentJsonHelpl',
  {
    defaultMessage:
      'JSON object to update a case. Use the variable selector to add cases data to the payload.',
  }
);

export const CREATE_COMMENT_METHOD = i18n.translate(
  'xpack.stackConnectors.components.casesWebhook.createCommentMethodTextFieldLabel',
  {
    defaultMessage: 'Create comment method',
  }
);
export const CREATE_COMMENT_URL = i18n.translate(
  'xpack.stackConnectors.components.casesWebhook.createCommentUrlTextFieldLabel',
  {
    defaultMessage: 'Create comment URL',
  }
);

export const CREATE_COMMENT_URL_HELP = i18n.translate(
  'xpack.stackConnectors.components.casesWebhook.createCommentUrlHelp',
  {
    defaultMessage: 'API URL to add a comment to a case.',
  }
);

export const CREATE_COMMENT_JSON = i18n.translate(
  'xpack.stackConnectors.components.casesWebhook.createCommentJsonTextFieldLabel',
  {
    defaultMessage: 'Create comment object',
  }
);
export const CREATE_COMMENT_JSON_HELP = i18n.translate(
  'xpack.stackConnectors.components.casesWebhook.createCommentJsonHelp',
  {
    defaultMessage:
      'JSON object to create a comment. Use the variable selector to add cases data to the payload.',
  }
);

export const HAS_AUTH = i18n.translate(
  'xpack.stackConnectors.components.casesWebhook.hasAuthSwitchLabel',
  {
    defaultMessage: 'Require authentication for this webhook',
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
      'Set fields to create a case in the external system. Check your service’s API documentation to understand what fields are required.',
  }
);

export const STEP_3 = i18n.translate('xpack.stackConnectors.components.casesWebhook.step3', {
  defaultMessage: 'Get case information',
});

export const STEP_3_DESCRIPTION = i18n.translate(
  'xpack.stackConnectors.components.casesWebhook.step3Description',
  {
    defaultMessage:
      'Set fields to add comments to a case in the external system. For some systems, this may be the same method as creating updates in cases. Check your service’s API documentation to understand what fields are required.',
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
      'Set fields to update a case in the external system. For some systems, this may be the same method as adding comments to cases.',
  }
);

export const STEP_4B = i18n.translate('xpack.stackConnectors.components.casesWebhook.step4b', {
  defaultMessage: 'Add comment in case',
});

export const STEP_4B_DESCRIPTION = i18n.translate(
  'xpack.stackConnectors.components.casesWebhook.step4bDescription',
  {
    defaultMessage:
      'Set fields to add comments to a case in the external system. For some systems, this may be the same method as creating updates in cases.',
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

export const CASE_ID_DESC = i18n.translate(
  'xpack.stackConnectors.components.casesWebhook.caseIdDesc',
  {
    defaultMessage: 'Kibana case ID',
  }
);

export const CASE_SEVERITY_DESC = i18n.translate(
  'xpack.stackConnectors.components.casesWebhook.caseSeverityDesc',
  {
    defaultMessage: 'Kibana case severity',
  }
);

export const CASE_STATUS_DESC = i18n.translate(
  'xpack.stackConnectors.components.casesWebhook.caseStatusDesc',
  {
    defaultMessage: 'Kibana case status',
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
    defaultMessage: 'External system ID',
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

export const SEVERITY_CRITICAL_LABEL = i18n.translate(
  'xpack.stackConnectors.components.casesWebhook.criticalLabel',
  {
    defaultMessage: 'Critical',
  }
);
export const SEVERITY_HIGH_LABEL = i18n.translate(
  'xpack.stackConnectors.components.casesWebhook.highLabel',
  {
    defaultMessage: 'High',
  }
);
export const SEVERITY_MEDIUM_LABEL = i18n.translate(
  'xpack.stackConnectors.components.casesWebhook.mediumLabel',
  {
    defaultMessage: 'Medium',
  }
);
export const SEVERITY_LOW_LABEL = i18n.translate(
  'xpack.stackConnectors.components.casesWebhook.lowLabel',
  {
    defaultMessage: 'Low',
  }
);

export const STATUS_OPEN = i18n.translate(
  'xpack.stackConnectors.components.casesWebhook.status.open',
  {
    defaultMessage: 'Open',
  }
);
export const STATUS_CLOSED = i18n.translate(
  'xpack.stackConnectors.components.casesWebhook.status.closed',
  {
    defaultMessage: 'Closed',
  }
);
export const STATUS_IN_PROGRESS = i18n.translate(
  'xpack.stackConnectors.components.casesWebhook.status.inProgress',
  {
    defaultMessage: 'In progress',
  }
);
