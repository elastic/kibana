/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const NOTES_TOOLTIP = i18n.translate(
  'xpack.securitySolution.timeline.body.notes.addNoteTooltip',
  {
    defaultMessage: 'Add note',
  }
);

export const NOTES_DISABLE_TOOLTIP = i18n.translate(
  'xpack.securitySolution.timeline.body.notes.disableEventTooltip',
  {
    defaultMessage: 'Notes may not be added here while editing a template timeline',
  }
);

export const OPEN_SESSION_VIEW = i18n.translate(
  'xpack.securitySolution.timeline.body.openSessionViewLabel',
  {
    defaultMessage: 'Open Session View',
  }
);

export const UNPINNED = (isAlert: boolean) =>
  i18n.translate('xpack.securitySolution.timeline.body.pinning.pinTooltip', {
    values: { isAlert },
    defaultMessage: 'Pin {isAlert, select, true{alert} other{event}}',
  });

export const PINNED = (isAlert: boolean) =>
  i18n.translate('xpack.securitySolution.timeline.body.pinning.unpinTooltip', {
    values: { isAlert },
    defaultMessage: 'Unpin {isAlert, select, true{alert} other{event}}',
  });

export const PINNED_WITH_NOTES = (isAlert: boolean) =>
  i18n.translate('xpack.securitySolution.timeline.body.pinning.pinnnedWithNotesTooltip', {
    values: { isAlert },
    defaultMessage:
      'This {isAlert, select, true{alert} other{event}} cannot be unpinned because it has notes',
  });

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

export const DISABLE_PIN = (isAlert: boolean) =>
  i18n.translate('xpack.securitySolution.timeline.body.pinning.disablePinnnedTooltip', {
    values: { isAlert },
    defaultMessage:
      'This {isAlert, select, true{alert} other{event}} may not be pinned while editing a template timeline',
  });

export const VIEW_DETAILS = i18n.translate(
  'xpack.securitySolution.timeline.body.actions.viewDetailsAriaLabel',
  {
    defaultMessage: 'View details',
  }
);

export const VIEW_DETAILS_FOR_ROW = ({ ariaRowindex }: { ariaRowindex: number }) =>
  i18n.translate('xpack.securitySolution.timeline.body.actions.viewDetailsForRowAriaLabel', {
    values: { ariaRowindex },
    defaultMessage: 'View details for the alert or event in row {ariaRowindex}',
  });

export const ACTION_INVESTIGATE_IN_RESOLVER = i18n.translate(
  'xpack.securitySolution.timeline.body.actions.investigateInResolverTooltip',
  {
    defaultMessage: 'Analyze event',
  }
);

export const CHECKBOX_FOR_ROW = ({
  ariaRowindex,
  checked,
}: {
  ariaRowindex: number;
  columnValues: string;
  checked: boolean;
}) =>
  i18n.translate('xpack.securitySolution.timeline.body.actions.checkboxForRowAriaLabel', {
    values: { ariaRowindex, checked },
    defaultMessage:
      '{checked, select, false {unchecked} true {checked}} checkbox for the alert or event in row {ariaRowindex}',
  });

export const ACTION_INVESTIGATE_IN_RESOLVER_FOR_ROW = ({
  ariaRowindex,
}: {
  ariaRowindex: number;
}) =>
  i18n.translate(
    'xpack.securitySolution.timeline.body.actions.investigateInResolverForRowAriaLabel',
    {
      values: { ariaRowindex },
      defaultMessage: 'Analyze the alert or event in row {ariaRowindex}',
    }
  );

export const SEND_ALERT_TO_TIMELINE_FOR_ROW = ({ ariaRowindex }: { ariaRowindex: number }) =>
  i18n.translate(
    'xpack.securitySolution.timeline.body.actions.sendAlertToTimelineForRowAriaLabel',
    {
      values: { ariaRowindex },
      defaultMessage: 'Send the alert in row {ariaRowindex} to timeline',
    }
  );

export const ADD_NOTES_FOR_ROW = ({ ariaRowindex }: { ariaRowindex: number }) =>
  i18n.translate('xpack.securitySolution.timeline.body.actions.addNotesForRowAriaLabel', {
    values: { ariaRowindex },
    defaultMessage: 'Add notes for the event in row {ariaRowindex} to timeline',
  });

export const PIN_EVENT_FOR_ROW = ({
  ariaRowindex,
  isEventPinned,
}: {
  ariaRowindex: number;
  isEventPinned: boolean;
}) =>
  i18n.translate('xpack.securitySolution.timeline.body.actions.pinEventForRowAriaLabel', {
    values: { ariaRowindex, isEventPinned },
    defaultMessage:
      '{isEventPinned, select, false {Pin} true {Unpin}} the event in row {ariaRowindex} to timeline',
  });

export const ATTACH_ALERT_TO_CASE_FOR_ROW = ({ ariaRowindex }: { ariaRowindex: number }) =>
  i18n.translate('xpack.securitySolution.timeline.body.actions.attachAlertToCaseForRowAriaLabel', {
    values: { ariaRowindex },
    defaultMessage: 'Attach the alert or event in row {ariaRowindex} to a case',
  });

export const MORE_ACTIONS_FOR_ROW = ({ ariaRowindex }: { ariaRowindex: number }) =>
  i18n.translate('xpack.securitySolution.timeline.body.actions.moreActionsForRowAriaLabel', {
    values: { ariaRowindex },
    defaultMessage: 'Select more actions for the alert or event in row {ariaRowindex}',
  });
