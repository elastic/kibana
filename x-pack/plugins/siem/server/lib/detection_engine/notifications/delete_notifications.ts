/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { readNotifications } from './read_notifications';
import { DeleteNotificationParams } from './types';

export const deleteNotifications = async ({
  alertsClient,
  id,
  ruleAlertId,
}: DeleteNotificationParams) => {
  const notification = await readNotifications({ alertsClient, id, ruleAlertId });
  if (notification == null) {
    return null;
  }

  if (notification.id != null) {
    await alertsClient.delete({ id: notification.id });
    return notification;
  } else if (id != null) {
    try {
      await alertsClient.delete({ id });
      return notification;
    } catch (err) {
      if (err.output.statusCode === 404) {
        return null;
      } else {
        throw err;
      }
    }
  } else {
    return null;
  }
};
