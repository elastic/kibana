/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const CASES_FEATURE_NO_PERMISSIONS_TITLE = i18n.translate(
  'xpack.securitySolution.cases.caseFeatureNoPermissionsTitle',
  {
    defaultMessage: 'Kibana feature privileges required',
  }
);

export const CASES_FEATURE_NO_PERMISSIONS_MSG = i18n.translate(
  'xpack.securitySolution.cases.caseFeatureNoPermissionsMessage',
  {
    defaultMessage:
      'To view cases, you must have privileges for the Cases feature in the Kibana space. For more information, contact your Kibana administrator.',
  }
);

export const BACK_TO_ALL = i18n.translate('xpack.securitySolution.cases.caseView.backLabel', {
  defaultMessage: 'Back to cases',
});

export const CANCEL = i18n.translate('xpack.securitySolution.cases.caseView.cancel', {
  defaultMessage: 'Cancel',
});

export const DELETE_CASE = i18n.translate(
  'xpack.securitySolution.cases.confirmDeleteCase.deleteCase',
  {
    defaultMessage: 'Delete case',
  }
);

export const DELETE_CASES = i18n.translate(
  'xpack.securitySolution.cases.confirmDeleteCase.deleteCases',
  {
    defaultMessage: 'Delete cases',
  }
);

export const NAME = i18n.translate('xpack.securitySolution.cases.caseView.name', {
  defaultMessage: 'Name',
});

export const REPORTER = i18n.translate('xpack.securitySolution.cases.caseView.reporterLabel', {
  defaultMessage: 'Reporter',
});

export const PARTICIPANTS = i18n.translate(
  'xpack.securitySolution.cases.caseView.particpantsLabel',
  {
    defaultMessage: 'Participants',
  }
);

export const CREATE_BC_TITLE = i18n.translate('xpack.securitySolution.cases.caseView.breadcrumb', {
  defaultMessage: 'Create',
});

export const CREATE_TITLE = i18n.translate('xpack.securitySolution.cases.caseView.create', {
  defaultMessage: 'Create case',
});

export const DESCRIPTION = i18n.translate('xpack.securitySolution.cases.caseView.description', {
  defaultMessage: 'Description',
});

export const DESCRIPTION_REQUIRED = i18n.translate(
  'xpack.securitySolution.cases.createCase.descriptionFieldRequiredError',
  {
    defaultMessage: 'A description is required.',
  }
);

export const EDIT = i18n.translate('xpack.securitySolution.cases.caseView.edit', {
  defaultMessage: 'Edit',
});

export const OPTIONAL = i18n.translate('xpack.securitySolution.cases.caseView.optional', {
  defaultMessage: 'Optional',
});

export const PAGE_TITLE = i18n.translate('xpack.securitySolution.cases.pageTitle', {
  defaultMessage: 'Cases',
});

export const CREATE_CASE = i18n.translate('xpack.securitySolution.cases.caseView.createCase', {
  defaultMessage: 'Create case',
});

export const CLOSE_CASE = i18n.translate('xpack.securitySolution.cases.caseView.closeCase', {
  defaultMessage: 'Close case',
});

export const CASE_NAME = i18n.translate('xpack.securitySolution.cases.caseView.caseName', {
  defaultMessage: 'Case name',
});

export const TO = i18n.translate('xpack.securitySolution.cases.caseView.to', {
  defaultMessage: 'to',
});

export const TAGS = i18n.translate('xpack.securitySolution.cases.caseView.tags', {
  defaultMessage: 'Tags',
});

export const ACTIONS = i18n.translate('xpack.securitySolution.cases.allCases.actions', {
  defaultMessage: 'Actions',
});

export const NO_REPORTERS_AVAILABLE = i18n.translate(
  'xpack.securitySolution.cases.caseView.noReportersAvailable',
  {
    defaultMessage: 'No reporters available.',
  }
);

export const COMMENTS = i18n.translate('xpack.securitySolution.cases.allCases.comments', {
  defaultMessage: 'Comments',
});

export const NO_TAGS = i18n.translate('xpack.securitySolution.cases.caseView.noTags', {
  defaultMessage: 'No tags are currently assigned to this case.',
});

export const TITLE_REQUIRED = i18n.translate(
  'xpack.securitySolution.cases.createCase.titleFieldRequiredError',
  {
    defaultMessage: 'A title is required.',
  }
);

export const CONFIGURE_CASES_PAGE_TITLE = i18n.translate(
  'xpack.securitySolution.cases.configureCases.headerTitle',
  {
    defaultMessage: 'Configure cases',
  }
);

export const SAVE = i18n.translate('xpack.securitySolution.cases.caseView.description.save', {
  defaultMessage: 'Save',
});

export const GO_TO_DOCUMENTATION = i18n.translate(
  'xpack.securitySolution.cases.caseView.goToDocumentationButton',
  {
    defaultMessage: 'View documentation',
  }
);

export const CONNECTORS = i18n.translate('xpack.securitySolution.cases.caseView.connectors', {
  defaultMessage: 'External Incident Management System',
});

export const EDIT_CONNECTOR = i18n.translate(
  'xpack.securitySolution.cases.caseView.editConnector',
  {
    defaultMessage: 'Change external incident management system',
  }
);

export const READ_ONLY_BADGE_TEXT = i18n.translate(
  'xpack.securitySolution.cases.badge.readOnly.text',
  {
    defaultMessage: 'Read only',
  }
);

export const READ_ONLY_BADGE_TOOLTIP = i18n.translate(
  'xpack.securitySolution.cases.badge.readOnly.tooltip',
  {
    defaultMessage: 'Unable to create or edit cases',
  }
);
