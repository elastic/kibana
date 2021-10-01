/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const ACTION_ADD_CASE = i18n.translate('xpack.timelines.cases.timeline.actions.addCase', {
  defaultMessage: 'Add to case',
});

export const ACTION_ADD_NEW_CASE = i18n.translate(
  'xpack.timelines.cases.timeline.actions.addNewCase',
  {
    defaultMessage: 'Add to new case',
  }
);

export const ACTION_ADD_EXISTING_CASE = i18n.translate(
  'xpack.timelines.cases.timeline.actions.addExistingCase',
  {
    defaultMessage: 'Add to existing case',
  }
);

export const ACTION_ADD_TO_CASE_ARIA_LABEL = i18n.translate(
  'xpack.timelines.cases.timeline.actions.addToCaseAriaLabel',
  {
    defaultMessage: 'Attach alert to case',
  }
);

export const ACTION_ADD_TO_CASE_TOOLTIP = i18n.translate(
  'xpack.timelines.cases.timeline.actions.addToCaseTooltip',
  {
    defaultMessage: 'Add to case',
  }
);

export const CASE_CREATED_SUCCESS_TOAST = (title: string) =>
  i18n.translate('xpack.timelines.cases.timeline.actions.caseCreatedSuccessToast', {
    values: { title },
    defaultMessage: 'An alert has been added to "{title}"',
  });

export const CASE_CREATED_SUCCESS_TOAST_TEXT = i18n.translate(
  'xpack.timelines.cases.timeline.actions.caseCreatedSuccessToastText',
  {
    defaultMessage: 'Alerts in this case have their status synched with the case status',
  }
);

export const VIEW_CASE = i18n.translate(
  'xpack.timelines.cases.timeline.actions.caseCreatedSuccessToastViewCaseLink',
  {
    defaultMessage: 'View Case',
  }
);

export const PERMISSIONS_MSG = i18n.translate(
  'xpack.timelines.cases.timeline.actions.permissionsMessage',
  {
    defaultMessage:
      'You are currently missing the required permissions to attach alerts to cases. Please contact your administrator for further assistance.',
  }
);

export const UNSUPPORTED_EVENTS_MSG = i18n.translate(
  'xpack.timelines.cases.timeline.actions.unsupportedEventsMessage',
  {
    defaultMessage: 'This event cannot be attached to a case',
  }
);

export const CREATE_TITLE = i18n.translate('xpack.timelines.cases.caseView.create', {
  defaultMessage: 'Create new case',
});
