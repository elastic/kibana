/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export * from '../../../translations';

export const CASE_CONNECTOR_DESC = i18n.translate(
  'xpack.securitySolution.case.components.connectors.case.selectMessageText',
  {
    defaultMessage: 'Create or update a case.',
  }
);

export const CASE_CONNECTOR_TITLE = i18n.translate(
  'xpack.securitySolution.case.components.connectors.case.actionTypeTitle',
  {
    defaultMessage: 'Cases',
  }
);

export const CASE_CONNECTOR_COMMENT_LABEL = i18n.translate(
  'xpack.securitySolution.case.components.connectors.case.commentLabel',
  {
    defaultMessage: 'Comment',
  }
);

export const CASE_CONNECTOR_COMMENT_REQUIRED = i18n.translate(
  'xpack.securitySolution.case.components.connectors.case.commentRequired',
  {
    defaultMessage: 'Comment is required.',
  }
);

export const CASE_CONNECTOR_CASES_DROPDOWN_ROW_LABEL = i18n.translate(
  'xpack.securitySolution.case.components.connectors.case.casesDropdownRowLabel',
  {
    defaultMessage: 'Case',
  }
);

export const CASE_CONNECTOR_CASES_DROPDOWN_PLACEHOLDER = i18n.translate(
  'xpack.securitySolution.case.components.connectors.case.casesDropdownPlaceholder',
  {
    defaultMessage: 'Select case',
  }
);

export const CASE_CONNECTOR_CASES_OPTION_NEW_CASE = i18n.translate(
  'xpack.securitySolution.case.components.connectors.case.optionAddNewCase',
  {
    defaultMessage: 'Add to a new case',
  }
);

export const CASE_CONNECTOR_CASES_OPTION_EXISTING_CASE = i18n.translate(
  'xpack.securitySolution.case.components.connectors.case.optionAddToExistingCase',
  {
    defaultMessage: 'Add to existing case',
  }
);

export const CASE_CONNECTOR_CASE_REQUIRED = i18n.translate(
  'xpack.securitySolution.case.components.connectors.case.caseRequired',
  {
    defaultMessage: 'You must select a case.',
  }
);

export const CASE_CONNECTOR_CALL_OUT_INFO = i18n.translate(
  'xpack.securitySolution.case.components.connectors.case.callOutInfo',
  {
    defaultMessage: 'All alerts after rule creation will be appended to the selected case.',
  }
);

export const CASE_CONNECTOR_ADD_NEW_CASE = i18n.translate(
  'xpack.securitySolution.case.components.connectors.case.addNewCaseOption',
  {
    defaultMessage: 'Add new case',
  }
);

export const CREATE_CASE = i18n.translate(
  'xpack.securitySolution.case.components.connectors.case.createCaseLabel',
  {
    defaultMessage: 'Create case',
  }
);

export const CONNECTED_CASE = i18n.translate(
  'xpack.securitySolution.case.components.connectors.case.connectedCaseLabel',
  {
    defaultMessage: 'Connected case',
  }
);
