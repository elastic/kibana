/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const NOTES_TOOLTIP = i18n.translate(
  'xpack.securitySolution.timeline.body.notes.addOrViewNotesForThisEventTooltip',
  {
    defaultMessage: 'Add notes for this event',
  }
);

export const NOTES_DISABLE_TOOLTIP = i18n.translate(
  'xpack.securitySolution.timeline.body.notes.disableEventTooltip',
  {
    defaultMessage: 'Notes may not be added here while editing a template timeline',
  }
);

export const COPY_TO_CLIPBOARD = i18n.translate(
  'xpack.securitySolution.timeline.body.copyToClipboardButtonLabel',
  {
    defaultMessage: 'Copy to Clipboard',
  }
);

export const OPEN_SESSION_VIEW = i18n.translate(
  'xpack.securitySolution.timeline.body.openSessionViewLabel',
  {
    defaultMessage: 'Open Session View',
  }
);

export const INVESTIGATE = i18n.translate(
  'xpack.securitySolution.timeline.body.actions.investigateLabel',
  {
    defaultMessage: 'Investigate',
  }
);

export const UNPINNED = i18n.translate(
  'xpack.securitySolution.timeline.body.pinning.unpinnedTooltip',
  {
    defaultMessage: 'Unpinned event',
  }
);

export const PINNED = i18n.translate('xpack.securitySolution.timeline.body.pinning.pinnedTooltip', {
  defaultMessage: 'Pinned event',
});

export const PINNED_WITH_NOTES = i18n.translate(
  'xpack.securitySolution.timeline.body.pinning.pinnnedWithNotesTooltip',
  {
    defaultMessage: 'This event cannot be unpinned because it has notes',
  }
);

export const SORTED_ASCENDING = i18n.translate(
  'xpack.securitySolution.timeline.body.sort.sortedAscendingTooltip',
  {
    defaultMessage: 'Sorted ascending',
  }
);

export const SORTED_DESCENDING = i18n.translate(
  'xpack.securitySolution.timeline.body.sort.sortedDescendingTooltip',
  {
    defaultMessage: 'Sorted descending',
  }
);

export const DISABLE_PIN = i18n.translate(
  'xpack.securitySolution.timeline.body.pinning.disablePinnnedTooltip',
  {
    defaultMessage: 'This event may not be pinned while editing a template timeline',
  }
);

export const VIEW_DETAILS = i18n.translate(
  'xpack.securitySolution.timeline.body.actions.viewDetailsAriaLabel',
  {
    defaultMessage: 'View details',
  }
);

export const VIEW_SUMMARY = i18n.translate(
  'xpack.securitySolution.timeline.body.actions.viewSummaryLabel',
  {
    defaultMessage: 'View summary',
  }
);

export const VIEW_DETAILS_FOR_ROW = ({
  ariaRowindex,
  columnValues,
}: {
  ariaRowindex: number;
  columnValues: string;
}) =>
  i18n.translate('xpack.securitySolution.timeline.body.actions.viewDetailsForRowAriaLabel', {
    values: { ariaRowindex, columnValues },
    defaultMessage:
      'View details for the alert or event in row {ariaRowindex}, with columns {columnValues}',
  });

export const EXPAND_EVENT = i18n.translate(
  'xpack.securitySolution.timeline.body.actions.expandEventTooltip',
  {
    defaultMessage: 'View details',
  }
);

export const COLLAPSE = i18n.translate(
  'xpack.securitySolution.timeline.body.actions.collapseAriaLabel',
  {
    defaultMessage: 'Collapse',
  }
);

export const ACTION_INVESTIGATE_IN_RESOLVER = i18n.translate(
  'xpack.securitySolution.timeline.body.actions.investigateInResolverTooltip',
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
  i18n.translate('xpack.securitySolution.timeline.body.actions.checkboxForRowAriaLabel', {
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
  i18n.translate(
    'xpack.securitySolution.timeline.body.actions.investigateInResolverForRowAriaLabel',
    {
      values: { ariaRowindex, columnValues },
      defaultMessage:
        'Analyze the alert or event in row {ariaRowindex}, with columns {columnValues}',
    }
  );

export const SEND_ALERT_TO_TIMELINE_FOR_ROW = ({
  ariaRowindex,
  columnValues,
}: {
  ariaRowindex: number;
  columnValues: string;
}) =>
  i18n.translate(
    'xpack.securitySolution.timeline.body.actions.sendAlertToTimelineForRowAriaLabel',
    {
      values: { ariaRowindex, columnValues },
      defaultMessage:
        'Send the alert in row {ariaRowindex} to timeline, with columns {columnValues}',
    }
  );

export const ADD_NOTES_FOR_ROW = ({
  ariaRowindex,
  columnValues,
}: {
  ariaRowindex: number;
  columnValues: string;
}) =>
  i18n.translate('xpack.securitySolution.timeline.body.actions.addNotesForRowAriaLabel', {
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
  i18n.translate('xpack.securitySolution.timeline.body.actions.pinEventForRowAriaLabel', {
    values: { ariaRowindex, columnValues, isEventPinned },
    defaultMessage:
      '{isEventPinned, select, false {Pin} true {Unpin}} the event in row {ariaRowindex} to timeline, with columns {columnValues}',
  });

export const TIMELINE_TOGGLE_BUTTON_ARIA_LABEL = ({
  isOpen,
  title,
}: {
  isOpen: boolean;
  title: string;
}) =>
  i18n.translate('xpack.securitySolution.timeline.properties.timelineToggleButtonAriaLabel', {
    values: { isOpen, title },
    defaultMessage: '{isOpen, select, false {Open} true {Close} other {Toggle}} timeline {title}',
  });

export const ATTACH_ALERT_TO_CASE_FOR_ROW = ({
  ariaRowindex,
  columnValues,
}: {
  ariaRowindex: number;
  columnValues: string;
}) =>
  i18n.translate('xpack.securitySolution.timeline.body.actions.attachAlertToCaseForRowAriaLabel', {
    values: { ariaRowindex, columnValues },
    defaultMessage:
      'Attach the alert or event in row {ariaRowindex} to a case, with columns {columnValues}',
  });

export const MORE_ACTIONS_FOR_ROW = ({
  ariaRowindex,
  columnValues,
}: {
  ariaRowindex: number;
  columnValues: string;
}) =>
  i18n.translate('xpack.securitySolution.timeline.body.actions.moreActionsForRowAriaLabel', {
    values: { ariaRowindex, columnValues },
    defaultMessage:
      'Select more actions for the alert or event in row {ariaRowindex}, with columns {columnValues}',
  });

export const INVESTIGATE_IN_RESOLVER_DISABLED = i18n.translate(
  'xpack.securitySolution.timeline.body.actions.investigateInResolverDisabledTooltip',
  {
    defaultMessage: 'This event cannot be analyzed since it has incompatible field mappings',
  }
);
