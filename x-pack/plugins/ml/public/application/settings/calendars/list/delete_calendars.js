/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getToastNotifications } from '../../../util/dependency_cache';
import { ml } from '../../../services/ml_api_service';
import { i18n } from '@kbn/i18n';
import { getErrorMessage } from '../../../../../common/util/errors';

export async function deleteCalendars(calendarsToDelete, callback) {
  if (calendarsToDelete === undefined || calendarsToDelete.length === 0) {
    return;
  }
  const toastNotifications = getToastNotifications();

  // Delete each of the specified calendars in turn, waiting for each response
  // before deleting the next to minimize load on the cluster.
  const messageId =
    calendarsToDelete.length > 1
      ? i18n.translate('xpack.ml.calendarsList.deleteCalendars.calendarsLabel', {
          defaultMessage: '{calendarsToDeleteCount} calendars',
          values: { calendarsToDeleteCount: calendarsToDelete.length },
        })
      : `${calendarsToDelete[0].calendar_id}`;
  toastNotifications.add(
    i18n.translate('xpack.ml.calendarsList.deleteCalendars.deletingCalendarsNotificationMessage', {
      defaultMessage: 'Deleting {messageId}',
      values: { messageId },
    })
  );

  for (const calendar of calendarsToDelete) {
    const calendarId = calendar.calendar_id;
    try {
      await ml.deleteCalendar({ calendarId });
    } catch (error) {
      console.log('Error deleting calendar:', error);
      toastNotifications.addDanger({
        title: i18n.translate(
          'xpack.ml.calendarsList.deleteCalendars.deletingCalendarErrorMessage',
          {
            defaultMessage: 'An error occurred deleting calendar {calendarId}',
            values: {
              calendarId: calendar.calendar_id,
            },
          }
        ),
        text: getErrorMessage(error),
      });
    }
  }

  toastNotifications.addSuccess(
    i18n.translate(
      'xpack.ml.calendarsList.deleteCalendars.deletingCalendarSuccessNotificationMessage',
      {
        defaultMessage: '{messageId} deleted',
        values: { messageId },
      }
    )
  );
  callback();
}
