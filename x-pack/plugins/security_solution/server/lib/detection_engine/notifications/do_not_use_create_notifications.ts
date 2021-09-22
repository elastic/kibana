/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SanitizedAlert } from '../../../../../alerting/common';
import { SERVER_APP_ID, __DO_NOT_USE__NOTIFICATIONS_ID } from '../../../../common/constants';
// eslint-disable-next-line no-restricted-imports
import {
  CreateNotificationParams,
  __DO_NOT_USE__RuleNotificationAlertTypeParams,
} from './do_not_use_types';
// eslint-disable-next-line no-restricted-imports
import { __DO_NOT_USE__addTags } from './do_not_use_add_tags';

/**
 * @deprecated Once legacy notifications/"side car actions" goes away this should be removed
 */
export const __DO_NOT_USE__createNotifications = async ({
  rulesClient,
  actions,
  enabled,
  ruleAlertId,
  interval,
  name,
}: CreateNotificationParams): Promise<
  SanitizedAlert<__DO_NOT_USE__RuleNotificationAlertTypeParams>
> =>
  rulesClient.create<__DO_NOT_USE__RuleNotificationAlertTypeParams>({
    data: {
      name,
      tags: __DO_NOT_USE__addTags([], ruleAlertId),
      alertTypeId: __DO_NOT_USE__NOTIFICATIONS_ID,
      consumer: SERVER_APP_ID,
      params: {
        ruleAlertId,
      },
      schedule: { interval },
      enabled,
      actions,
      throttle: null,
      notifyWhen: null,
    },
  });
