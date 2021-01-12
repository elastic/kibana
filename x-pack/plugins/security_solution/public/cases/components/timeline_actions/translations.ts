/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export const ACTION_ADD_CASE = i18n.translate(
  'xpack.securitySolution.case.timeline.actions.addCase',
  {
    defaultMessage: 'Add to case',
  }
);

export const ACTION_ADD_NEW_CASE = i18n.translate(
  'xpack.securitySolution.case.timeline.actions.addNewCase',
  {
    defaultMessage: 'Add to new case',
  }
);

export const ACTION_ADD_EXISTING_CASE = i18n.translate(
  'xpack.securitySolution.case.timeline.actions.addExistingCase',
  {
    defaultMessage: 'Add to existing case',
  }
);

export const ACTION_ADD_TO_CASE_ARIA_LABEL = i18n.translate(
  'xpack.securitySolution.case.timeline.actions.addToCaseAriaLabel',
  {
    defaultMessage: 'Attach alert to case',
  }
);

export const ACTION_ADD_TO_CASE_TOOLTIP = i18n.translate(
  'xpack.securitySolution.case.timeline.actions.addToCaseTooltip',
  {
    defaultMessage: 'Add to case',
  }
);

export const CASE_CREATED_SUCCESS_TOAST = (title: string) =>
  i18n.translate('xpack.securitySolution.case.timeline.actions.caseCreatedSuccessToast', {
    values: { title },
    defaultMessage: 'An alert has been added to "{title}"',
  });

export const CASE_CREATED_SUCCESS_TOAST_TEXT = i18n.translate(
  'xpack.securitySolution.case.timeline.actions.caseCreatedSuccessToastText',
  {
    defaultMessage: 'Alerts in this case have their status synched with the case status',
  }
);
