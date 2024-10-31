/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export * from '../../common/translations';

export const INCIDENT_MANAGEMENT_SYSTEM_TITLE = i18n.translate(
  'xpack.cases.configureCases.incidentManagementSystemTitle',
  {
    defaultMessage: 'External incident management system',
  }
);

export const INCIDENT_MANAGEMENT_SYSTEM_DESC = i18n.translate(
  'xpack.cases.configureCases.incidentManagementSystemDesc',
  {
    defaultMessage:
      'Connect your cases to an external incident management system. You can then push case data as an incident in a third-party system.',
  }
);

export const INCIDENT_MANAGEMENT_SYSTEM_LABEL = i18n.translate(
  'xpack.cases.configureCases.incidentManagementSystemLabel',
  {
    defaultMessage: 'Incident management system',
  }
);

export const ADD_NEW_CONNECTOR = i18n.translate('xpack.cases.configureCases.addNewConnector', {
  defaultMessage: 'Add new connector',
});

export const ADD_CONNECTOR = i18n.translate('xpack.cases.configureCases.addConnector', {
  defaultMessage: 'Add connector',
});

export const CASE_CLOSURE_OPTIONS_TITLE = i18n.translate(
  'xpack.cases.configureCases.caseClosureOptionsTitle',
  {
    defaultMessage: 'Case closures',
  }
);

export const CASE_CLOSURE_OPTIONS_DESC = i18n.translate(
  'xpack.cases.configureCases.caseClosureOptionsDesc',
  {
    defaultMessage:
      'Define how to close your cases. Automatic closures require an established connection to an external incident management system.',
  }
);

export const CASE_CLOSURE_OPTIONS_LABEL = i18n.translate(
  'xpack.cases.configureCases.caseClosureOptionsLabel',
  {
    defaultMessage: 'Case closure options',
  }
);

export const CASE_CLOSURE_OPTIONS_MANUAL = i18n.translate(
  'xpack.cases.configureCases.caseClosureOptionsManual',
  {
    defaultMessage: 'Manually close cases',
  }
);

export const CASE_CLOSURE_OPTIONS_NEW_INCIDENT = i18n.translate(
  'xpack.cases.configureCases.caseClosureOptionsNewIncident',
  {
    defaultMessage: 'Automatically close cases when pushing new incident to external system',
  }
);

export const FIELD_MAPPING_TITLE = (thirdPartyName: string): string =>
  i18n.translate('xpack.cases.configureCases.fieldMappingTitle', {
    values: { thirdPartyName },
    defaultMessage: '{ thirdPartyName } field mappings',
  });

export const FIELD_MAPPING_DESC = (thirdPartyName: string): string =>
  i18n.translate('xpack.cases.configureCases.fieldMappingDesc', {
    values: { thirdPartyName },
    defaultMessage:
      'Map Case fields to { thirdPartyName } fields when pushing data to { thirdPartyName }. Field mappings require an established connection to { thirdPartyName }.',
  });

export const FIELD_MAPPING_DESC_ERR = (thirdPartyName: string): string =>
  i18n.translate('xpack.cases.configureCases.fieldMappingDescErr', {
    values: { thirdPartyName },
    defaultMessage: 'Failed to retrieve mappings for { thirdPartyName }.',
  });

export const FIELD_MAPPING_FIRST_COL = i18n.translate(
  'xpack.cases.configureCases.fieldMappingFirstCol',
  {
    defaultMessage: 'Kibana case field',
  }
);

export const FIELD_MAPPING_SECOND_COL = (thirdPartyName: string): string =>
  i18n.translate('xpack.cases.configureCases.fieldMappingSecondCol', {
    values: { thirdPartyName },
    defaultMessage: '{ thirdPartyName } field',
  });

export const FIELD_MAPPING_THIRD_COL = i18n.translate(
  'xpack.cases.configureCases.fieldMappingThirdCol',
  {
    defaultMessage: 'On edit and update',
  }
);

export const CANCEL = i18n.translate('xpack.cases.configureCases.cancelButton', {
  defaultMessage: 'Cancel',
});

export const SAVE = i18n.translate('xpack.cases.configureCases.saveButton', {
  defaultMessage: 'Save',
});

export const WARNING_NO_CONNECTOR_TITLE = i18n.translate(
  'xpack.cases.configureCases.warningTitle',
  {
    defaultMessage: 'Warning',
  }
);

export const COMMENT = i18n.translate('xpack.cases.configureCases.commentMapping', {
  defaultMessage: 'Comments',
});

export const UPDATE_SELECTED_CONNECTOR = (connectorName: string): string =>
  i18n.translate('xpack.cases.configureCases.updateSelectedConnector', {
    values: { connectorName },
    defaultMessage: 'Update { connectorName }',
  });

export const DEPRECATED_TOOLTIP_TEXT = i18n.translate(
  'xpack.cases.configureCases.deprecatedTooltipText',
  {
    defaultMessage: 'deprecated',
  }
);

export const DEPRECATED_TOOLTIP_CONTENT = i18n.translate(
  'xpack.cases.configureCases.deprecatedTooltipContent',
  {
    defaultMessage: 'This connector is deprecated. Update it, or create a new one.',
  }
);

export const CONFIGURE_CASES_PAGE_TITLE = i18n.translate('xpack.cases.configureCases.headerTitle', {
  defaultMessage: 'Settings',
});

export const CASES_WEBHOOK_MAPPINGS = i18n.translate(
  'xpack.cases.configureCases.casesWebhookMappings',
  {
    defaultMessage:
      'Webhook - Case Management field mappings are configured in the connector settings in the third-party REST API JSON.',
  }
);

export const ADD_CUSTOM_FIELD = i18n.translate(
  'xpack.cases.configureCases.customFields.addCustomField',
  {
    defaultMessage: 'Add field',
  }
);

export const EDIT_CUSTOM_FIELD = i18n.translate(
  'xpack.cases.configureCases.customFields.editCustomField',
  {
    defaultMessage: 'Edit field',
  }
);

export const CREATE_TEMPLATE = i18n.translate('xpack.cases.configureCases.templates.flyoutTitle', {
  defaultMessage: 'Add template',
});

export const EDIT_TEMPLATE = i18n.translate('xpack.cases.configureCases.templates.editTemplate', {
  defaultMessage: 'Edit template',
});
