/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const EVENTS_TABLE_ARIA_LABEL = ({
  activePage,
  totalPages,
}: {
  activePage: number;
  totalPages: number;
}) =>
  i18n.translate('xpack.timelines.timeline.eventsTableAriaLabel', {
    values: { activePage, totalPages },
    defaultMessage: 'events; Page {activePage} of {totalPages}',
  });

export const UNIT = (totalCount: number) =>
  i18n.translate('xpack.timelines.timeline.unit', {
    values: { totalCount },
    defaultMessage: `{totalCount, plural, =1 {event} other {events}}`,
  });

export const ALERTS_UNIT = (totalCount: number) =>
  i18n.translate('xpack.timelines.timeline.alertsUnit', {
    values: { totalCount },
    defaultMessage: `{totalCount, plural, =1 {alert} other {alerts}}`,
  });

export const BULK_ACTION_OPEN_SELECTED = i18n.translate(
  'xpack.timelines.timeline.openSelectedTitle',
  {
    defaultMessage: 'Open selected',
  }
);

export const BULK_ACTION_CLOSE_SELECTED = i18n.translate(
  'xpack.timelines.timeline.closeSelectedTitle',
  {
    defaultMessage: 'Close selected',
  }
);

export const BULK_ACTION_IN_PROGRESS_SELECTED = i18n.translate(
  'xpack.timelines.timeline.inProgressSelectedTitle',
  {
    defaultMessage: 'Mark in progress',
  }
);

export const BULK_ACTION_FAILED_SINGLE_ALERT = i18n.translate(
  'xpack.timelines.timeline.updateAlertStatusFailedSingleAlert',
  {
    defaultMessage: 'Failed to update alert because it was already being modified.',
  }
);

export const CLOSED_ALERT_SUCCESS_TOAST = (totalAlerts: number) =>
  i18n.translate('xpack.timelines.timeline.closedAlertSuccessToastMessage', {
    values: { totalAlerts },
    defaultMessage:
      'Successfully closed {totalAlerts} {totalAlerts, plural, =1 {alert} other {alerts}}.',
  });

export const OPENED_ALERT_SUCCESS_TOAST = (totalAlerts: number) =>
  i18n.translate('xpack.timelines.timeline.openedAlertSuccessToastMessage', {
    values: { totalAlerts },
    defaultMessage:
      'Successfully opened {totalAlerts} {totalAlerts, plural, =1 {alert} other {alerts}}.',
  });

export const IN_PROGRESS_ALERT_SUCCESS_TOAST = (totalAlerts: number) =>
  i18n.translate('xpack.timelines.timeline.inProgressAlertSuccessToastMessage', {
    values: { totalAlerts },
    defaultMessage:
      'Successfully marked {totalAlerts} {totalAlerts, plural, =1 {alert} other {alerts}} as in progress.',
  });

export const CLOSED_ALERT_FAILED_TOAST = i18n.translate(
  'xpack.timelines.timeline.closedAlertFailedToastMessage',
  {
    defaultMessage: 'Failed to close alert(s).',
  }
);

export const OPENED_ALERT_FAILED_TOAST = i18n.translate(
  'xpack.timelines.timeline.openedAlertFailedToastMessage',
  {
    defaultMessage: 'Failed to open alert(s)',
  }
);

export const IN_PROGRESS_ALERT_FAILED_TOAST = i18n.translate(
  'xpack.timelines.timeline.inProgressAlertFailedToastMessage',
  {
    defaultMessage: 'Failed to mark alert(s) as in progress',
  }
);

export const UPDATE_ALERT_STATUS_FAILED = (conflicts: number) =>
  i18n.translate('xpack.timelines.timeline.updateAlertStatusFailed', {
    values: { conflicts },
    defaultMessage:
      'Failed to update { conflicts } {conflicts, plural, =1 {alert} other {alerts}}.',
  });

export const UPDATE_ALERT_STATUS_FAILED_DETAILED = (updated: number, conflicts: number) =>
  i18n.translate('xpack.timelines.timeline.updateAlertStatusFailedDetailed', {
    values: { updated, conflicts },
    defaultMessage: `{ updated } {updated, plural, =1 {alert was} other {alerts were}} updated successfully, but { conflicts } failed to update
         because { conflicts, plural, =1 {it was} other {they were}} already being modified.`,
  });
