/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const OPEN_SESSION_VIEW = i18n.translate(
  'xpack.securitySolution.timeline.body.openSessionViewLabel',
  {
    defaultMessage: 'Open Session View',
  }
);

export const NOTES_DISABLE_TOOLTIP = i18n.translate(
  'xpack.securitySolution.timeline.body.notes.disableEventTooltip',
  {
    defaultMessage: 'Notes may not be added here while editing a template timeline',
  }
);

export const NOTES_TOOLTIP = i18n.translate(
  'xpack.securitySolution.timeline.body.notes.addNoteTooltip',
  {
    defaultMessage: 'Add note',
  }
);

export const SORT_FIELDS = i18n.translate('xpack.securitySolution.timeline.sortFieldsButton', {
  defaultMessage: 'Sort fields',
});

export const FULL_SCREEN = i18n.translate('xpack.securitySolution.timeline.fullScreenButton', {
  defaultMessage: 'Full screen',
});

export const VIEW_DETAILS = i18n.translate(
  'xpack.securitySolution.hoverActions.viewDetailsAriaLabel',
  {
    defaultMessage: 'View details',
  }
);

export const VIEW_DETAILS_FOR_ROW = ({
  ariaRowindex,
  columnValues,
}: {
  ariaRowindex: number;
  columnValues: string;
}) =>
  i18n.translate('xpack.securitySolution.hoverActions.viewDetailsForRowAriaLabel', {
    values: { ariaRowindex, columnValues },
    defaultMessage:
      'View details for the alert or event in row {ariaRowindex}, with columns {columnValues}',
  });

export const ACTION_INVESTIGATE_IN_RESOLVER = i18n.translate(
  'xpack.securitySolution.hoverActions.investigateInResolverTooltip',
  {
    defaultMessage: 'Analyze event',
  }
);

export const CHECKBOX_FOR_ROW = ({
  ariaRowindex,
  columnValues,
  checked,
}: {
  ariaRowindex: number;
  columnValues: string;
  checked: boolean;
}) =>
  i18n.translate('xpack.securitySolution.hoverActions.checkboxForRowAriaLabel', {
    values: { ariaRowindex, checked, columnValues },
    defaultMessage:
      '{checked, select, false {unchecked} true {checked}} checkbox for the alert or event in row {ariaRowindex}, with columns {columnValues}',
  });

export const ACTION_INVESTIGATE_IN_RESOLVER_FOR_ROW = ({
  ariaRowindex,
  columnValues,
}: {
  ariaRowindex: number;
  columnValues: string;
}) =>
  i18n.translate('xpack.securitySolution.hoverActions.investigateInResolverForRowAriaLabel', {
    values: { ariaRowindex, columnValues },
    defaultMessage: 'Analyze the alert or event in row {ariaRowindex}, with columns {columnValues}',
  });

export const SEND_ALERT_TO_TIMELINE_FOR_ROW = ({
  ariaRowindex,
  columnValues,
}: {
  ariaRowindex: number;
  columnValues: string;
}) =>
  i18n.translate('xpack.securitySolution.hoverActions.sendAlertToTimelineForRowAriaLabel', {
    values: { ariaRowindex, columnValues },
    defaultMessage: 'Send the alert in row {ariaRowindex} to timeline, with columns {columnValues}',
  });

export const ADD_NOTES_FOR_ROW = ({
  ariaRowindex,
  columnValues,
}: {
  ariaRowindex: number;
  columnValues: string;
}) =>
  i18n.translate('xpack.securitySolution.hoverActions.addNotesForRowAriaLabel', {
    values: { ariaRowindex, columnValues },
    defaultMessage:
      'Add notes for the event in row {ariaRowindex} to timeline, with columns {columnValues}',
  });

export const PIN_EVENT_FOR_ROW = ({
  ariaRowindex,
  columnValues,
  isEventPinned,
}: {
  ariaRowindex: number;
  columnValues: string;
  isEventPinned: boolean;
}) =>
  i18n.translate('xpack.securitySolution.hoverActions.pinEventForRowAriaLabel', {
    values: { ariaRowindex, columnValues, isEventPinned },
    defaultMessage:
      '{isEventPinned, select, false {Pin} true {Unpin}} the event in row {ariaRowindex} to timeline, with columns {columnValues}',
  });

export const MORE_ACTIONS_FOR_ROW = ({
  ariaRowindex,
  columnValues,
}: {
  ariaRowindex: number;
  columnValues: string;
}) =>
  i18n.translate('xpack.securitySolution.hoverActions.moreActionsForRowAriaLabel', {
    values: { ariaRowindex, columnValues },
    defaultMessage:
      'Select more actions for the alert or event in row {ariaRowindex}, with columns {columnValues}',
  });
