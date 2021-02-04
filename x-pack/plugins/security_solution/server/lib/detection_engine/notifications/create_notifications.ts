/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Alert } from '../../../../../alerts/common';
import { SERVER_APP_ID, NOTIFICATIONS_ID } from '../../../../common/constants';
import { CreateNotificationParams, RuleNotificationAlertTypeParams } from './types';
import { addTags } from './add_tags';
import { transformRuleToAlertAction } from '../../../../common/detection_engine/transform_actions';

export const createNotifications = async ({
  alertsClient,
  actions,
  enabled,
  ruleAlertId,
  interval,
  name,
}: CreateNotificationParams): Promise<Alert<RuleNotificationAlertTypeParams>> =>
  alertsClient.create<RuleNotificationAlertTypeParams>({
    data: {
      name,
      tags: addTags([], ruleAlertId),
      alertTypeId: NOTIFICATIONS_ID,
      consumer: SERVER_APP_ID,
      params: {
        ruleAlertId,
      },
      schedule: { interval },
      enabled,
      actions: actions.map(transformRuleToAlertAction),
      throttle: null,
      notifyWhen: null,
    },
  });
