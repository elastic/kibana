/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PartialAlert } from '../../../../../alerts/server';
import { readNotifications } from './read_notifications';
import { UpdateNotificationParams } from './types';
import { addTags } from './add_tags';
import { createNotifications } from './create_notifications';
import { transformRuleToAlertAction } from '../../../../common/detection_engine/transform_actions';

export const updateNotifications = async ({
  alertsClient,
  actions,
  enabled,
  ruleAlertId,
  name,
  interval,
}: UpdateNotificationParams): Promise<PartialAlert | null> => {
  const notification = await readNotifications({ alertsClient, id: undefined, ruleAlertId });

  if (interval && notification) {
    return alertsClient.update({
      id: notification.id,
      data: {
        tags: addTags([], ruleAlertId),
        name,
        schedule: {
          interval,
        },
        actions: actions.map(transformRuleToAlertAction),
        params: {
          ruleAlertId,
        },
        throttle: null,
        notifyWhen: null,
      },
    });
  } else if (interval && !notification) {
    return createNotifications({
      alertsClient,
      enabled,
      name,
      interval,
      actions,
      ruleAlertId,
    });
  } else if (!interval && notification) {
    await alertsClient.delete({ id: notification.id });
    return null;
  } else {
    return null;
  }
};
