/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const CASES_FEATURE_NO_PERMISSIONS_TITLE = i18n.translate(
  'xpack.cases.caseFeatureNoPermissionsTitle',
  {
    defaultMessage: 'Kibana feature privileges required',
  }
);

export const CASES_FEATURE_NO_PERMISSIONS_MSG = i18n.translate(
  'xpack.cases.caseFeatureNoPermissionsMessage',
  {
    defaultMessage:
      'To view cases, you must have privileges for the Cases feature in the Kibana space. For more information, contact your Kibana administrator.',
  }
);

export const BACK_TO_ALL = i18n.translate('xpack.cases.caseView.backLabel', {
  defaultMessage: 'Back to cases',
});

export const CANCEL = i18n.translate('xpack.cases.caseView.cancel', {
  defaultMessage: 'Cancel',
});

export const DELETE_CASE = (quantity: number = 1) =>
  i18n.translate('xpack.cases.confirmDeleteCase.deleteCase', {
    values: { quantity },
    defaultMessage: `Delete {quantity, plural, =1 {case} other {cases}}`,
  });

export const NAME = i18n.translate('xpack.cases.caseView.name', {
  defaultMessage: 'Name',
});

export const OPENED_ON = i18n.translate('xpack.cases.caseView.openedOn', {
  defaultMessage: 'Opened on',
});

export const CLOSED_ON = i18n.translate('xpack.cases.caseView.closedOn', {
  defaultMessage: 'Closed on',
});

export const REPORTER = i18n.translate('xpack.cases.caseView.reporterLabel', {
  defaultMessage: 'Reporter',
});

export const PARTICIPANTS = i18n.translate('xpack.cases.caseView.particpantsLabel', {
  defaultMessage: 'Participants',
});

export const CREATE_BC_TITLE = i18n.translate('xpack.cases.caseView.breadcrumb', {
  defaultMessage: 'Create',
});

export const CREATE_TITLE = i18n.translate('xpack.cases.caseView.create', {
  defaultMessage: 'Create new case',
});

export const DESCRIPTION = i18n.translate('xpack.cases.caseView.description', {
  defaultMessage: 'Description',
});

export const DESCRIPTION_REQUIRED = i18n.translate(
  'xpack.cases.createCase.descriptionFieldRequiredError',
  {
    defaultMessage: 'A description is required.',
  }
);

export const COMMENT_REQUIRED = i18n.translate('xpack.cases.caseView.commentFieldRequiredError', {
  defaultMessage: 'A comment is required.',
});

export const REQUIRED_FIELD = i18n.translate('xpack.cases.caseView.fieldRequiredError', {
  defaultMessage: 'Required field',
});

export const EDIT = i18n.translate('xpack.cases.caseView.edit', {
  defaultMessage: 'Edit',
});

export const OPTIONAL = i18n.translate('xpack.cases.caseView.optional', {
  defaultMessage: 'Optional',
});

export const PAGE_TITLE = i18n.translate('xpack.cases.pageTitle', {
  defaultMessage: 'Cases',
});

export const CREATE_CASE = i18n.translate('xpack.cases.caseView.createCase', {
  defaultMessage: 'Create case',
});

export const CLOSE_CASE = i18n.translate('xpack.cases.caseView.closeCase', {
  defaultMessage: 'Close case',
});

export const MARK_CASE_IN_PROGRESS = i18n.translate('xpack.cases.caseView.markInProgress', {
  defaultMessage: 'Mark in progress',
});

export const REOPEN_CASE = i18n.translate('xpack.cases.caseView.reopenCase', {
  defaultMessage: 'Reopen case',
});

export const OPEN_CASE = i18n.translate('xpack.cases.caseView.openCase', {
  defaultMessage: 'Open case',
});

export const CASE_NAME = i18n.translate('xpack.cases.caseView.caseName', {
  defaultMessage: 'Case name',
});

export const TO = i18n.translate('xpack.cases.caseView.to', {
  defaultMessage: 'to',
});

export const TAGS = i18n.translate('xpack.cases.caseView.tags', {
  defaultMessage: 'Tags',
});

export const ACTIONS = i18n.translate('xpack.cases.allCases.actions', {
  defaultMessage: 'Actions',
});

export const NO_TAGS_AVAILABLE = i18n.translate('xpack.cases.allCases.noTagsAvailable', {
  defaultMessage: 'No tags available',
});

export const NO_REPORTERS_AVAILABLE = i18n.translate('xpack.cases.caseView.noReportersAvailable', {
  defaultMessage: 'No reporters available.',
});

export const COMMENTS = i18n.translate('xpack.cases.allCases.comments', {
  defaultMessage: 'Comments',
});

export const TAGS_HELP = i18n.translate('xpack.cases.createCase.fieldTagsHelpText', {
  defaultMessage:
    'Type one or more custom identifying tags for this case. Press enter after each tag to begin a new one.',
});

export const NO_TAGS = i18n.translate('xpack.cases.caseView.noTags', {
  defaultMessage: 'No tags are currently assigned to this case.',
});

export const TITLE_REQUIRED = i18n.translate('xpack.cases.createCase.titleFieldRequiredError', {
  defaultMessage: 'A title is required.',
});

export const CONFIGURE_CASES_PAGE_TITLE = i18n.translate('xpack.cases.configureCases.headerTitle', {
  defaultMessage: 'Configure cases',
});

export const CONFIGURE_CASES_BUTTON = i18n.translate('xpack.cases.configureCasesButton', {
  defaultMessage: 'Edit external connection',
});

export const ADD_COMMENT = i18n.translate('xpack.cases.caseView.comment.addComment', {
  defaultMessage: 'Add comment',
});

export const ADD_COMMENT_HELP_TEXT = i18n.translate(
  'xpack.cases.caseView.comment.addCommentHelpText',
  {
    defaultMessage: 'Add a new comment...',
  }
);

export const SAVE = i18n.translate('xpack.cases.caseView.description.save', {
  defaultMessage: 'Save',
});

export const GO_TO_DOCUMENTATION = i18n.translate('xpack.cases.caseView.goToDocumentationButton', {
  defaultMessage: 'View documentation',
});

export const CONNECTORS = i18n.translate('xpack.cases.caseView.connectors', {
  defaultMessage: 'External Incident Management System',
});

export const EDIT_CONNECTOR = i18n.translate('xpack.cases.caseView.editConnector', {
  defaultMessage: 'Change external incident management system',
});

export const NO_CONNECTOR = i18n.translate('xpack.cases.common.noConnector', {
  defaultMessage: 'No connector selected',
});

export const UNKNOWN = i18n.translate('xpack.cases.caseView.unknown', {
  defaultMessage: 'Unknown',
});

export const MARKED_CASE_AS = i18n.translate('xpack.cases.caseView.markedCaseAs', {
  defaultMessage: 'marked case as',
});

export const OPEN_CASES = i18n.translate('xpack.cases.caseTable.openCases', {
  defaultMessage: 'Open cases',
});

export const CLOSED_CASES = i18n.translate('xpack.cases.caseTable.closedCases', {
  defaultMessage: 'Closed cases',
});

export const IN_PROGRESS_CASES = i18n.translate('xpack.cases.caseTable.inProgressCases', {
  defaultMessage: 'In progress cases',
});

export const SYNC_ALERTS_SWITCH_LABEL_ON = i18n.translate(
  'xpack.cases.settings.syncAlertsSwitchLabelOn',
  {
    defaultMessage: 'On',
  }
);

export const SYNC_ALERTS_SWITCH_LABEL_OFF = i18n.translate(
  'xpack.cases.settings.syncAlertsSwitchLabelOff',
  {
    defaultMessage: 'Off',
  }
);

export const SYNC_ALERTS_HELP = i18n.translate('xpack.cases.components.create.syncAlertHelpText', {
  defaultMessage:
    'Enabling this option will sync the status of alerts in this case with the case status.',
});

export const ALERT = i18n.translate('xpack.cases.common.alertLabel', {
  defaultMessage: 'Alert',
});

export const ALERTS = i18n.translate('xpack.cases.common.alertsLabel', {
  defaultMessage: 'Alerts',
});

export const ALERT_ADDED_TO_CASE = i18n.translate('xpack.cases.common.alertAddedToCase', {
  defaultMessage: 'added to case',
});

export const SELECTABLE_MESSAGE_COLLECTIONS = i18n.translate(
  'xpack.cases.common.allCases.table.selectableMessageCollections',
  {
    defaultMessage: 'Cases with sub-cases cannot be selected',
  }
);
export const SELECT_CASE_TITLE = i18n.translate('xpack.cases.common.allCases.caseModal.title', {
  defaultMessage: 'Select case',
});
