/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export const INCIDENT_MANAGEMENT_SYSTEM_TITLE = i18n.translate(
  'xpack.siem.case.configureCases.incidentManagementSystemTitle',
  {
    defaultMessage: 'Connect to third-party incident management system',
  }
);

export const INCIDENT_MANAGEMENT_SYSTEM_DESC = i18n.translate(
  'xpack.siem.case.configureCases.incidentManagementSystemDesc',
  {
    defaultMessage:
      'You may optionally connect SIEM cases to a third-party incident management system of your choosing. This will allow you to push case data as an incident in your chosen third-party system.',
  }
);

export const INCIDENT_MANAGEMENT_SYSTEM_LABEL = i18n.translate(
  'xpack.siem.case.configureCases.incidentManagementSystemLabel',
  {
    defaultMessage: 'Incident management system',
  }
);

export const NO_CONNECTOR = i18n.translate('xpack.siem.case.configureCases.noConnector', {
  defaultMessage: 'No connector selected',
});

export const ADD_NEW_CONNECTOR = i18n.translate('xpack.siem.case.configureCases.addNewConnector', {
  defaultMessage: 'Add new connector option',
});

export const CASE_CLOSURE_OPTIONS_TITLE = i18n.translate(
  'xpack.siem.case.configureCases.caseClosureOptionsTitle',
  {
    defaultMessage: 'Cases Closures',
  }
);

export const CASE_CLOSURE_OPTIONS_DESC = i18n.translate(
  'xpack.siem.case.configureCases.caseClosureOptionsDesc',
  {
    defaultMessage:
      'Define how you wish SIEM cases to be closed. Automated case closures require an established connection to a third-party incident management system.',
  }
);

export const CASE_CLOSURE_OPTIONS_LABEL = i18n.translate(
  'xpack.siem.case.configureCases.caseClosureOptionsLabel',
  {
    defaultMessage: 'Case closure options',
  }
);

export const CASE_CLOSURE_OPTIONS_MANUAL = i18n.translate(
  'xpack.siem.case.configureCases.caseClosureOptionsManual',
  {
    defaultMessage: 'Manually close SIEM cases',
  }
);

export const CASE_CLOSURE_OPTIONS_NEW_INCIDENT = i18n.translate(
  'xpack.siem.case.configureCases.caseClosureOptionsNewIncident',
  {
    defaultMessage: 'Automatically close SIEM cases when pushing new incident to third-party',
  }
);

export const CASE_CLOSURE_OPTIONS_CLOSED_INCIDENT = i18n.translate(
  'xpack.siem.case.configureCases.caseClosureOptionsClosedIncident',
  {
    defaultMessage: 'Automatically close SIEM cases when incident is closed in third-party',
  }
);

export const FIELD_MAPPING_TITLE = i18n.translate(
  'xpack.siem.case.configureCases.fieldMappingTitle',
  {
    defaultMessage: 'Field mappings',
  }
);

export const FIELD_MAPPING_DESC = i18n.translate(
  'xpack.siem.case.configureCases.fieldMappingDesc',
  {
    defaultMessage:
      'Map SIEM case fields when pushing data to a third-party. Field mappings require an established connection to a third-party incident management system.',
  }
);

export const FIELD_MAPPING_FIRST_COL = i18n.translate(
  'xpack.siem.case.configureCases.fieldMappingFirstCol',
  {
    defaultMessage: 'SIEM case field',
  }
);

export const FIELD_MAPPING_SECOND_COL = i18n.translate(
  'xpack.siem.case.configureCases.fieldMappingSecondCol',
  {
    defaultMessage: 'External incident field',
  }
);

export const FIELD_MAPPING_THIRD_COL = i18n.translate(
  'xpack.siem.case.configureCases.fieldMappingThirdCol',
  {
    defaultMessage: 'On edit and update',
  }
);

export const FIELD_MAPPING_EDIT_NOTHING = i18n.translate(
  'xpack.siem.case.configureCases.fieldMappingEditNothing',
  {
    defaultMessage: 'Nothing',
  }
);

export const FIELD_MAPPING_EDIT_OVERWRITE = i18n.translate(
  'xpack.siem.case.configureCases.fieldMappingEditOverwrite',
  {
    defaultMessage: 'Overwrite',
  }
);

export const FIELD_MAPPING_EDIT_APPEND = i18n.translate(
  'xpack.siem.case.configureCases.fieldMappingEditAppend',
  {
    defaultMessage: 'Append',
  }
);

export const CANCEL = i18n.translate('xpack.siem.case.configureCases.cancelButton', {
  defaultMessage: 'Cancel',
});

export const SAVE_CHANGES = i18n.translate('xpack.siem.case.configureCases.saveChangesButton', {
  defaultMessage: 'Save Changes',
});

export const WARNING_NO_CONNECTOR_TITLE = i18n.translate(
  'xpack.siem.case.configureCases.warningTitle',
  {
    defaultMessage: 'Warning',
  }
);

export const WARNING_NO_CONNECTOR_MESSAGE = i18n.translate(
  'xpack.siem.case.configureCases.warningMessage',
  {
    defaultMessage:
      'The selected connector has been deleted. Either select a different connector or create a new one.',
  }
);

export const FIELD_MAPPING_FIELD_NOT_MAPPED = i18n.translate(
  'xpack.siem.case.configureCases.fieldMappingFieldNotMapped',
  {
    defaultMessage: 'Not mapped',
  }
);

export const FIELD_MAPPING_FIELD_SHORT_DESC = i18n.translate(
  'xpack.siem.case.configureCases.fieldMappingFieldShortDescription',
  {
    defaultMessage: 'Short Description',
  }
);

export const FIELD_MAPPING_FIELD_DESC = i18n.translate(
  'xpack.siem.case.configureCases.fieldMappingFieldDescription',
  {
    defaultMessage: 'Description',
  }
);

export const FIELD_MAPPING_FIELD_COMMENTS = i18n.translate(
  'xpack.siem.case.configureCases.fieldMappingFieldComments',
  {
    defaultMessage: 'Comments',
  }
);

export const UPDATE_CONNECTOR = i18n.translate('xpack.siem.case.configureCases.updateConnector', {
  defaultMessage: 'Update connector',
});

export const UNSAVED_CHANGES = (unsavedChanges: number): string => {
  return i18n.translate('xpack.siem.case.configureCases.unsavedChanges', {
    values: { unsavedChanges },
    defaultMessage: '{unsavedChanges} unsaved changes',
  });
};
