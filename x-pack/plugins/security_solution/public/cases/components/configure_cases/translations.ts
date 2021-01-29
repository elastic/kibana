/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export * from '../../translations';

export const INCIDENT_MANAGEMENT_SYSTEM_TITLE = i18n.translate(
  'xpack.securitySolution.case.configureCases.incidentManagementSystemTitle',
  {
    defaultMessage: 'Connect to external incident management system',
  }
);

export const INCIDENT_MANAGEMENT_SYSTEM_DESC = i18n.translate(
  'xpack.securitySolution.case.configureCases.incidentManagementSystemDesc',
  {
    defaultMessage:
      'You may optionally connect Security cases to an external incident management system of your choosing. This will allow you to push case data as an incident in your chosen third-party system.',
  }
);

export const INCIDENT_MANAGEMENT_SYSTEM_LABEL = i18n.translate(
  'xpack.securitySolution.case.configureCases.incidentManagementSystemLabel',
  {
    defaultMessage: 'Incident management system',
  }
);

export const ADD_NEW_CONNECTOR = i18n.translate(
  'xpack.securitySolution.case.configureCases.addNewConnector',
  {
    defaultMessage: 'Add new connector',
  }
);

export const CASE_CLOSURE_OPTIONS_TITLE = i18n.translate(
  'xpack.securitySolution.case.configureCases.caseClosureOptionsTitle',
  {
    defaultMessage: 'Case Closures',
  }
);

export const CASE_CLOSURE_OPTIONS_DESC = i18n.translate(
  'xpack.securitySolution.case.configureCases.caseClosureOptionsDesc',
  {
    defaultMessage:
      'Define how you wish Security cases to be closed. Automated case closures require an established connection to an external incident management system.',
  }
);

export const CASE_CLOSURE_OPTIONS_LABEL = i18n.translate(
  'xpack.securitySolution.case.configureCases.caseClosureOptionsLabel',
  {
    defaultMessage: 'Case closure options',
  }
);

export const CASE_CLOSURE_OPTIONS_MANUAL = i18n.translate(
  'xpack.securitySolution.case.configureCases.caseClosureOptionsManual',
  {
    defaultMessage: 'Manually close Security cases',
  }
);

export const CASE_CLOSURE_OPTIONS_NEW_INCIDENT = i18n.translate(
  'xpack.securitySolution.case.configureCases.caseClosureOptionsNewIncident',
  {
    defaultMessage:
      'Automatically close Security cases when pushing new incident to external system',
  }
);

export const CASE_CLOSURE_OPTIONS_CLOSED_INCIDENT = i18n.translate(
  'xpack.securitySolution.case.configureCases.caseClosureOptionsClosedIncident',
  {
    defaultMessage: 'Automatically close Security cases when incident is closed in external system',
  }
);
export const FIELD_MAPPING_TITLE = (thirdPartyName: string): string => {
  return i18n.translate('xpack.securitySolution.case.configureCases.fieldMappingTitle', {
    values: { thirdPartyName },
    defaultMessage: '{ thirdPartyName } field mappings',
  });
};

export const FIELD_MAPPING_DESC = (thirdPartyName: string): string => {
  return i18n.translate('xpack.securitySolution.case.configureCases.fieldMappingDesc', {
    values: { thirdPartyName },
    defaultMessage:
      'Map Security Case fields to { thirdPartyName } fields when pushing data to { thirdPartyName }. Field mappings require an established connection to { thirdPartyName }.',
  });
};

export const FIELD_MAPPING_DESC_ERR = (thirdPartyName: string): string => {
  return i18n.translate('xpack.securitySolution.case.configureCases.fieldMappingDescErr', {
    values: { thirdPartyName },
    defaultMessage:
      'Field mappings require an established connection to { thirdPartyName }. Please check your connection credentials.',
  });
};
export const EDIT_FIELD_MAPPING_TITLE = (thirdPartyName: string): string => {
  return i18n.translate('xpack.securitySolution.case.configureCases.editFieldMappingTitle', {
    values: { thirdPartyName },
    defaultMessage: 'Edit { thirdPartyName } field mappings',
  });
};

export const FIELD_MAPPING_FIRST_COL = i18n.translate(
  'xpack.securitySolution.case.configureCases.fieldMappingFirstCol',
  {
    defaultMessage: 'Security case field',
  }
);

export const FIELD_MAPPING_SECOND_COL = (thirdPartyName: string): string => {
  return i18n.translate('xpack.securitySolution.case.configureCases.fieldMappingSecondCol', {
    values: { thirdPartyName },
    defaultMessage: '{ thirdPartyName } field',
  });
};

export const FIELD_MAPPING_THIRD_COL = i18n.translate(
  'xpack.securitySolution.case.configureCases.fieldMappingThirdCol',
  {
    defaultMessage: 'On edit and update',
  }
);

export const FIELD_MAPPING_EDIT_NOTHING = i18n.translate(
  'xpack.securitySolution.case.configureCases.fieldMappingEditNothing',
  {
    defaultMessage: 'Nothing',
  }
);

export const FIELD_MAPPING_EDIT_OVERWRITE = i18n.translate(
  'xpack.securitySolution.case.configureCases.fieldMappingEditOverwrite',
  {
    defaultMessage: 'Overwrite',
  }
);

export const FIELD_MAPPING_EDIT_APPEND = i18n.translate(
  'xpack.securitySolution.case.configureCases.fieldMappingEditAppend',
  {
    defaultMessage: 'Append',
  }
);

export const CANCEL = i18n.translate('xpack.securitySolution.case.configureCases.cancelButton', {
  defaultMessage: 'Cancel',
});

export const SAVE = i18n.translate('xpack.securitySolution.case.configureCases.saveButton', {
  defaultMessage: 'Save',
});

export const SAVE_CLOSE = i18n.translate(
  'xpack.securitySolution.case.configureCases.saveAndCloseButton',
  {
    defaultMessage: 'Save & close',
  }
);

export const WARNING_NO_CONNECTOR_TITLE = i18n.translate(
  'xpack.securitySolution.case.configureCases.warningTitle',
  {
    defaultMessage: 'Warning',
  }
);

export const WARNING_NO_CONNECTOR_MESSAGE = i18n.translate(
  'xpack.securitySolution.case.configureCases.warningMessage',
  {
    defaultMessage:
      'The selected connector has been deleted. Either select a different connector or create a new one.',
  }
);

export const MAPPING_FIELD_NOT_MAPPED = i18n.translate(
  'xpack.securitySolution.case.configureCases.mappingFieldNotMapped',
  {
    defaultMessage: 'Not mapped',
  }
);

export const COMMENT = i18n.translate('xpack.securitySolution.case.configureCases.commentMapping', {
  defaultMessage: 'Comments',
});

export const NO_FIELDS_ERROR = (connectorName: string): string => {
  return i18n.translate('xpack.securitySolution.case.configureCases.noFieldsError', {
    values: { connectorName },
    defaultMessage:
      'No { connectorName } fields found. Please check your { connectorName } connector settings or your { connectorName } instance settings to resolve.',
  });
};

export const BLANK_MAPPINGS = (connectorName: string): string => {
  return i18n.translate('xpack.securitySolution.case.configureCases.blankMappings', {
    values: { connectorName },
    defaultMessage: 'At least one field needs to be mapped to { connectorName }',
  });
};

export const REQUIRED_MAPPINGS = (connectorName: string, fields: string): string => {
  return i18n.translate('xpack.securitySolution.case.configureCases.requiredMappings', {
    values: { connectorName, fields },
    defaultMessage:
      'At least one Case field needs to be mapped to the following required { connectorName } fields: { fields }',
  });
};
export const UPDATE_FIELD_MAPPINGS = i18n.translate(
  'xpack.securitySolution.case.configureCases.updateConnector',
  {
    defaultMessage: 'Update field mappings',
  }
);

export const UPDATE_SELECTED_CONNECTOR = (connectorName: string): string => {
  return i18n.translate('xpack.securitySolution.case.configureCases.updateSelectedConnector', {
    values: { connectorName },
    defaultMessage: 'Update { connectorName }',
  });
};
