/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { toastNotifications } from 'ui/notify';
import { ml } from '../../../services/ml_api_service';


export async function deleteCalendars(calendarsToDelete, callback) {
  if (calendarsToDelete === undefined || calendarsToDelete.length === 0) {
    return;
  }

  // Delete each of the specified calendars in turn, waiting for each response
  // before deleting the next to minimize load on the cluster.
  const messageId = `${(calendarsToDelete.length > 1) ?
    `${calendarsToDelete.length} calendars` : calendarsToDelete[0].calendar_id}`;
  toastNotifications.add(`Deleting ${messageId}`);

  for(const calendar of calendarsToDelete) {
    const calendarId = calendar.calendar_id;
    try {
      await ml.deleteCalendar({ calendarId });
    } catch (error) {
      console.log('Error deleting calendar:', error);
      let errorMessage = `An error occurred deleting calendar ${calendar.calendar_id}`;
      if (error.message) {
        errorMessage += ` : ${error.message}`;
      }
      toastNotifications.addDanger(errorMessage);
    }
  }

  toastNotifications.addSuccess(`${messageId} deleted`);
  callback();
}
