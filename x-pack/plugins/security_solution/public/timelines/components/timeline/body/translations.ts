/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

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
      'This {isAlert, select, true{alert} other{event}} cannot be unpinned because it has notes in Timeline',
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
