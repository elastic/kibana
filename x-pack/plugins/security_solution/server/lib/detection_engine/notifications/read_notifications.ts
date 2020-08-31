/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SanitizedAlert } from '../../../../../alerts/common';
import { ReadNotificationParams, isAlertType } from './types';
import { findNotifications } from './find_notifications';
import { INTERNAL_RULE_ALERT_ID_KEY } from '../../../../common/constants';

export const readNotifications = async ({
  alertsClient,
  id,
  ruleAlertId,
}: ReadNotificationParams): Promise<SanitizedAlert | null> => {
  if (id != null) {
    try {
      const notification = await alertsClient.get({ id });
      if (isAlertType(notification)) {
        return notification;
      } else {
        return null;
      }
    } catch (err) {
      if (err?.output?.statusCode === 404) {
        return null;
      } else {
        // throw non-404 as they would be 500 or other internal errors
        throw err;
      }
    }
  } else if (ruleAlertId != null) {
    const notificationFromFind = await findNotifications({
      alertsClient,
      filter: `alert.attributes.tags: "${INTERNAL_RULE_ALERT_ID_KEY}:${ruleAlertId}"`,
      page: 1,
    });
    if (notificationFromFind.data.length === 0 || !isAlertType(notificationFromFind.data[0])) {
      return null;
    } else {
      return notificationFromFind.data[0];
    }
  } else {
    // should never get here, and yet here we are.
    return null;
  }
};
