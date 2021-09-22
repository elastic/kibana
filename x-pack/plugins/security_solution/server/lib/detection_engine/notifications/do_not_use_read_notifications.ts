/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AlertTypeParams, SanitizedAlert } from '../../../../../alerting/common';
// eslint-disable-next-line no-restricted-imports
import {
  __DO_NOT_USE__ReadNotificationParams,
  __DO_NOT_USE__isAlertType,
} from './do_not_use_types';
// eslint-disable-next-line no-restricted-imports
import { __DO_NOT_USE__findNotifications } from './do_not_use_find_notifications';
import { INTERNAL_RULE_ALERT_ID_KEY } from '../../../../common/constants';

/**
 * @deprecated Once legacy notifications/"side car actions" goes away this should be removed
 */
export const __DO_NOT_USE__readNotifications = async ({
  rulesClient,
  id,
  ruleAlertId,
}: __DO_NOT_USE__ReadNotificationParams): Promise<SanitizedAlert<AlertTypeParams> | null> => {
  if (id != null) {
    try {
      const notification = await rulesClient.get({ id });
      if (__DO_NOT_USE__isAlertType(notification)) {
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
    const notificationFromFind = await __DO_NOT_USE__findNotifications({
      rulesClient,
      filter: `alert.attributes.tags: "${INTERNAL_RULE_ALERT_ID_KEY}:${ruleAlertId}"`,
      page: 1,
    });
    if (
      notificationFromFind.data.length === 0 ||
      !__DO_NOT_USE__isAlertType(notificationFromFind.data[0])
    ) {
      return null;
    } else {
      return notificationFromFind.data[0];
    }
  } else {
    // should never get here, and yet here we are.
    return null;
  }
};
