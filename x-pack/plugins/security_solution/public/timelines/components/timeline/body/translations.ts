/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
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

export const EXPAND = i18n.translate(
  'xpack.securitySolution.timeline.body.actions.expandAriaLabel',
  {
    defaultMessage: 'Expand',
  }
);

export const COLLAPSE = i18n.translate(
  'xpack.securitySolution.timeline.body.actions.collapseAriaLabel',
  {
    defaultMessage: 'Collapse',
  }
);

export const COLLAPSE_EVENT = i18n.translate(
  'xpack.securitySolution.timeline.body.actions.collapseEventTooltip',
  {
    defaultMessage: 'Collapse event',
  }
);

export const ACTION_INVESTIGATE_IN_RESOLVER = i18n.translate(
  'xpack.securitySolution.timeline.body.actions.investigateInResolverTooltip',
  {
    defaultMessage: 'Analyze event',
  }
);
