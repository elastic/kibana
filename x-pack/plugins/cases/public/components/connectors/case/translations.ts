/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export * from '../../../common/translations';

export const CASE_CONNECTOR_DESC = i18n.translate(
  'xpack.cases.components.connectors.cases.selectMessageText',
  {
    defaultMessage: 'Create or update a case.',
  }
);

export const CASE_CONNECTOR_TITLE = i18n.translate(
  'xpack.cases.components.connectors.cases.actionTypeTitle',
  {
    defaultMessage: 'Cases',
  }
);
export const CASE_CONNECTOR_CASES_DROPDOWN_ROW_LABEL = i18n.translate(
  'xpack.cases.components.connectors.cases.casesDropdownRowLabel',
  {
    defaultMessage: 'Case allowing sub-cases',
  }
);

export const CASE_CONNECTOR_CASES_OPTION_EXISTING_CASE = i18n.translate(
  'xpack.cases.components.connectors.cases.optionAddToExistingCase',
  {
    defaultMessage: 'Add to existing case',
  }
);

export const CASE_CONNECTOR_CASE_REQUIRED = i18n.translate(
  'xpack.cases.components.connectors.cases.caseRequired',
  {
    defaultMessage: 'You must select a case.',
  }
);

export const CASE_CONNECTOR_CALL_OUT_TITLE = i18n.translate(
  'xpack.cases.components.connectors.cases.callOutTitle',
  {
    defaultMessage: 'Generated alerts will be attached to sub-cases',
  }
);

export const CASE_CONNECTOR_CALL_OUT_MSG = i18n.translate(
  'xpack.cases.components.connectors.cases.callOutMsg',
  {
    defaultMessage:
      'A case can contain multiple sub-cases to allow grouping of generated alerts. Sub-cases will give more granular control over the status of these generated alerts and prevents having too many alerts attached to one case.',
  }
);

export const CASE_CONNECTOR_ADD_NEW_CASE = i18n.translate(
  'xpack.cases.components.connectors.cases.addNewCaseOption',
  {
    defaultMessage: 'Add new case',
  }
);

export const CREATE_CASE = i18n.translate(
  'xpack.cases.components.connectors.cases.createCaseLabel',
  {
    defaultMessage: 'Create case',
  }
);
