/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const CASES_FEATURE_NO_PERMISSIONS_TITLE = i18n.translate(
  'xpack.observability.cases.caseFeatureNoPermissionsTitle',
  {
    defaultMessage: 'Kibana feature privileges required',
  }
);

export const CASES_FEATURE_NO_PERMISSIONS_MSG = i18n.translate(
  'xpack.observability.cases.caseFeatureNoPermissionsMessage',
  {
    defaultMessage:
      'To view cases, you must have privileges for the Cases feature in the Kibana space. For more information, contact your Kibana administrator.',
  }
);
export const BACK_TO_ALL = i18n.translate('xpack.observability.cases.caseView.backLabel', {
  defaultMessage: 'Back to cases',
});

export const CANCEL = i18n.translate('xpack.observability.cases.caseView.cancel', {
  defaultMessage: 'Cancel',
});

export const DELETE_CASE = i18n.translate(
  'xpack.observability.cases.confirmDeleteCase.deleteCase',
  {
    defaultMessage: 'Delete case',
  }
);

export const DELETE_CASES = i18n.translate(
  'xpack.observability.cases.confirmDeleteCase.deleteCases',
  {
    defaultMessage: 'Delete cases',
  }
);

export const NAME = i18n.translate('xpack.observability.cases.caseView.name', {
  defaultMessage: 'Name',
});

export const REPORTER = i18n.translate('xpack.observability.cases.caseView.reporterLabel', {
  defaultMessage: 'Reporter',
});

export const PARTICIPANTS = i18n.translate('xpack.observability.cases.caseView.particpantsLabel', {
  defaultMessage: 'Participants',
});

export const CREATE_TITLE = i18n.translate('xpack.observability.cases.caseView.create', {
  defaultMessage: 'Create new case',
});

export const DESCRIPTION = i18n.translate('xpack.observability.cases.caseView.description', {
  defaultMessage: 'Description',
});

export const DESCRIPTION_REQUIRED = i18n.translate(
  'xpack.observability.cases.createCase.descriptionFieldRequiredError',
  {
    defaultMessage: 'A description is required.',
  }
);

export const COMMENT_REQUIRED = i18n.translate(
  'xpack.observability.cases.caseView.commentFieldRequiredError',
  {
    defaultMessage: 'A comment is required.',
  }
);

export const REQUIRED_FIELD = i18n.translate(
  'xpack.observability.cases.caseView.fieldRequiredError',
  {
    defaultMessage: 'Required field',
  }
);

export const EDIT = i18n.translate('xpack.observability.cases.caseView.edit', {
  defaultMessage: 'Edit',
});

export const OPTIONAL = i18n.translate('xpack.observability.cases.caseView.optional', {
  defaultMessage: 'Optional',
});

export const PAGE_TITLE = i18n.translate('xpack.observability.cases.pageTitle', {
  defaultMessage: 'Cases',
});

export const CREATE_CASE = i18n.translate('xpack.observability.cases.caseView.createCase', {
  defaultMessage: 'Create case',
});

export const CLOSE_CASE = i18n.translate('xpack.observability.cases.caseView.closeCase', {
  defaultMessage: 'Close case',
});

export const REOPEN_CASE = i18n.translate('xpack.observability.cases.caseView.reopenCase', {
  defaultMessage: 'Reopen case',
});

export const CASE_NAME = i18n.translate('xpack.observability.cases.caseView.caseName', {
  defaultMessage: 'Case name',
});

export const TO = i18n.translate('xpack.observability.cases.caseView.to', {
  defaultMessage: 'to',
});

export const TAGS = i18n.translate('xpack.observability.cases.caseView.tags', {
  defaultMessage: 'Tags',
});

export const ACTIONS = i18n.translate('xpack.observability.cases.allCases.actions', {
  defaultMessage: 'Actions',
});

export const NO_TAGS_AVAILABLE = i18n.translate(
  'xpack.observability.cases.allCases.noTagsAvailable',
  {
    defaultMessage: 'No tags available',
  }
);

export const NO_REPORTERS_AVAILABLE = i18n.translate(
  'xpack.observability.cases.caseView.noReportersAvailable',
  {
    defaultMessage: 'No reporters available.',
  }
);

export const COMMENTS = i18n.translate('xpack.observability.cases.allCases.comments', {
  defaultMessage: 'Comments',
});

export const TAGS_HELP = i18n.translate('xpack.observability.cases.createCase.fieldTagsHelpText', {
  defaultMessage:
    'Type one or more custom identifying tags for this case. Press enter after each tag to begin a new one.',
});

export const NO_TAGS = i18n.translate('xpack.observability.cases.caseView.noTags', {
  defaultMessage: 'No tags are currently assigned to this case.',
});

export const TITLE_REQUIRED = i18n.translate(
  'xpack.observability.cases.createCase.titleFieldRequiredError',
  {
    defaultMessage: 'A title is required.',
  }
);

export const CONFIGURE_CASES_PAGE_TITLE = i18n.translate(
  'xpack.observability.cases.configureCases.headerTitle',
  {
    defaultMessage: 'Configure cases',
  }
);

export const CONFIGURE_CASES_BUTTON = i18n.translate(
  'xpack.observability.cases.configureCasesButton',
  {
    defaultMessage: 'Edit external connection',
  }
);

export const ADD_COMMENT = i18n.translate('xpack.observability.cases.caseView.comment.addComment', {
  defaultMessage: 'Add comment',
});

export const ADD_COMMENT_HELP_TEXT = i18n.translate(
  'xpack.observability.cases.caseView.comment.addCommentHelpText',
  {
    defaultMessage: 'Add a new comment...',
  }
);

export const SAVE = i18n.translate('xpack.observability.cases.caseView.description.save', {
  defaultMessage: 'Save',
});

export const GO_TO_DOCUMENTATION = i18n.translate(
  'xpack.observability.cases.caseView.goToDocumentationButton',
  {
    defaultMessage: 'View documentation',
  }
);

export const CONNECTORS = i18n.translate('xpack.observability.cases.caseView.connectors', {
  defaultMessage: 'External Incident Management System',
});

export const EDIT_CONNECTOR = i18n.translate('xpack.observability.cases.caseView.editConnector', {
  defaultMessage: 'Change external incident management system',
});

export const READ_ONLY_BADGE_TEXT = i18n.translate(
  'xpack.observability.cases.badge.readOnly.text',
  {
    defaultMessage: 'Read only',
  }
);

export const READ_ONLY_BADGE_TOOLTIP = i18n.translate(
  'xpack.observability.cases.badge.readOnly.tooltip',
  {
    defaultMessage: 'Unable to create or edit cases',
  }
);
