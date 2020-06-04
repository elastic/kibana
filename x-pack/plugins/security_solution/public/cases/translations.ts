/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export const SAVED_OBJECT_NO_PERMISSIONS_TITLE = i18n.translate(
  'xpack.securitySolution.case.caseSavedObjectNoPermissionsTitle',
  {
    defaultMessage: 'Kibana feature privileges required',
  }
);

export const SAVED_OBJECT_NO_PERMISSIONS_MSG = i18n.translate(
  'xpack.securitySolution.case.caseSavedObjectNoPermissionsMessage',
  {
    defaultMessage:
      'To view cases, you must have privileges for the Saved Object Management feature in the Kibana space. For more information, contact your Kibana administrator.',
  }
);

export const BACK_TO_ALL = i18n.translate('xpack.securitySolution.case.caseView.backLabel', {
  defaultMessage: 'Back to cases',
});

export const CANCEL = i18n.translate('xpack.securitySolution.case.caseView.cancel', {
  defaultMessage: 'Cancel',
});

export const DELETE_CASE = i18n.translate(
  'xpack.securitySolution.case.confirmDeleteCase.deleteCase',
  {
    defaultMessage: 'Delete case',
  }
);

export const DELETE_CASES = i18n.translate(
  'xpack.securitySolution.case.confirmDeleteCase.deleteCases',
  {
    defaultMessage: 'Delete cases',
  }
);

export const NAME = i18n.translate('xpack.securitySolution.case.caseView.name', {
  defaultMessage: 'Name',
});

export const OPENED_ON = i18n.translate('xpack.securitySolution.case.caseView.openedOn', {
  defaultMessage: 'Opened on',
});

export const CLOSED_ON = i18n.translate('xpack.securitySolution.case.caseView.closedOn', {
  defaultMessage: 'Closed on',
});

export const REPORTER = i18n.translate('xpack.securitySolution.case.caseView.reporterLabel', {
  defaultMessage: 'Reporter',
});

export const PARTICIPANTS = i18n.translate(
  'xpack.securitySolution.case.caseView.particpantsLabel',
  {
    defaultMessage: 'Participants',
  }
);

export const CREATE_BC_TITLE = i18n.translate('xpack.securitySolution.case.caseView.breadcrumb', {
  defaultMessage: 'Create',
});

export const CREATE_TITLE = i18n.translate('xpack.securitySolution.case.caseView.create', {
  defaultMessage: 'Create new case',
});

export const DESCRIPTION = i18n.translate('xpack.securitySolution.case.caseView.description', {
  defaultMessage: 'Description',
});

export const DESCRIPTION_REQUIRED = i18n.translate(
  'xpack.securitySolution.case.createCase.descriptionFieldRequiredError',
  {
    defaultMessage: 'A description is required.',
  }
);

export const COMMENT_REQUIRED = i18n.translate(
  'xpack.securitySolution.case.caseView.commentFieldRequiredError',
  {
    defaultMessage: 'A comment is required.',
  }
);

export const REQUIRED_FIELD = i18n.translate(
  'xpack.securitySolution.case.caseView.fieldRequiredError',
  {
    defaultMessage: 'Required field',
  }
);

export const EDIT = i18n.translate('xpack.securitySolution.case.caseView.edit', {
  defaultMessage: 'Edit',
});

export const OPTIONAL = i18n.translate('xpack.securitySolution.case.caseView.optional', {
  defaultMessage: 'Optional',
});

export const PAGE_TITLE = i18n.translate('xpack.securitySolution.case.pageTitle', {
  defaultMessage: 'Cases',
});

export const CREATE_CASE = i18n.translate('xpack.securitySolution.case.caseView.createCase', {
  defaultMessage: 'Create case',
});

export const CLOSED_CASE = i18n.translate('xpack.securitySolution.case.caseView.closedCase', {
  defaultMessage: 'Closed case',
});

export const CLOSE_CASE = i18n.translate('xpack.securitySolution.case.caseView.closeCase', {
  defaultMessage: 'Close case',
});

export const REOPEN_CASE = i18n.translate('xpack.securitySolution.case.caseView.reopenCase', {
  defaultMessage: 'Reopen case',
});

export const REOPENED_CASE = i18n.translate('xpack.securitySolution.case.caseView.reopenedCase', {
  defaultMessage: 'Reopened case',
});

export const CASE_NAME = i18n.translate('xpack.securitySolution.case.caseView.caseName', {
  defaultMessage: 'Case name',
});

export const TO = i18n.translate('xpack.securitySolution.case.caseView.to', {
  defaultMessage: 'to',
});

export const TAGS = i18n.translate('xpack.securitySolution.case.caseView.tags', {
  defaultMessage: 'Tags',
});

export const ACTIONS = i18n.translate('xpack.securitySolution.case.allCases.actions', {
  defaultMessage: 'Actions',
});

export const NO_TAGS_AVAILABLE = i18n.translate(
  'xpack.securitySolution.case.allCases.noTagsAvailable',
  {
    defaultMessage: 'No tags available',
  }
);

export const NO_REPORTERS_AVAILABLE = i18n.translate(
  'xpack.securitySolution.case.caseView.noReportersAvailable',
  {
    defaultMessage: 'No reporters available.',
  }
);

export const COMMENTS = i18n.translate('xpack.securitySolution.case.allCases.comments', {
  defaultMessage: 'Comments',
});

export const TAGS_HELP = i18n.translate(
  'xpack.securitySolution.case.createCase.fieldTagsHelpText',
  {
    defaultMessage:
      'Type one or more custom identifying tags for this case. Press enter after each tag to begin a new one.',
  }
);

export const NO_TAGS = i18n.translate('xpack.securitySolution.case.caseView.noTags', {
  defaultMessage: 'No tags are currently assigned to this case.',
});

export const TITLE_REQUIRED = i18n.translate(
  'xpack.securitySolution.case.createCase.titleFieldRequiredError',
  {
    defaultMessage: 'A title is required.',
  }
);

export const CONFIGURE_CASES_PAGE_TITLE = i18n.translate(
  'xpack.securitySolution.case.configureCases.headerTitle',
  {
    defaultMessage: 'Configure cases',
  }
);

export const CONFIGURE_CASES_BUTTON = i18n.translate(
  'xpack.securitySolution.case.configureCasesButton',
  {
    defaultMessage: 'Edit external connection',
  }
);

export const ADD_COMMENT = i18n.translate(
  'xpack.securitySolution.case.caseView.comment.addComment',
  {
    defaultMessage: 'Add comment',
  }
);

export const ADD_COMMENT_HELP_TEXT = i18n.translate(
  'xpack.securitySolution.case.caseView.comment.addCommentHelpText',
  {
    defaultMessage: 'Add a new comment...',
  }
);

export const SAVE = i18n.translate('xpack.securitySolution.case.caseView.description.save', {
  defaultMessage: 'Save',
});

export const GO_TO_DOCUMENTATION = i18n.translate(
  'xpack.securitySolution.case.caseView.goToDocumentationButton',
  {
    defaultMessage: 'View documentation',
  }
);

export const CONNECTORS = i18n.translate('xpack.securitySolution.case.caseView.connectors', {
  defaultMessage: 'External incident management system',
});

export const EDIT_CONNECTOR = i18n.translate('xpack.securitySolution.case.caseView.editConnector', {
  defaultMessage: 'Change external incident management system',
});
