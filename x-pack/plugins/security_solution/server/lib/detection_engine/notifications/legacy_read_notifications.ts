/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleTypeParams, SanitizedRule } from '@kbn/alerting-plugin/common';
// eslint-disable-next-line no-restricted-imports
import type { LegacyReadNotificationParams } from './legacy_types';
// eslint-disable-next-line no-restricted-imports
import { legacyIsAlertType } from './legacy_types';
// eslint-disable-next-line no-restricted-imports
import { legacyFindNotifications } from './legacy_find_notifications';

/**
 * @deprecated Once we are confident all rules relying on side-car actions SO's have been migrated to SO references we should remove this function
 */
export const legacyReadNotifications = async ({
  rulesClient,
  id,
  ruleAlertId,
}: LegacyReadNotificationParams): Promise<SanitizedRule<RuleTypeParams> | null> => {
  if (id != null) {
    try {
      const notification = await rulesClient.get({ id });
      if (legacyIsAlertType(notification)) {
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
    const notificationFromFind = await legacyFindNotifications({
      rulesClient,
      filter: `alert.attributes.params.ruleAlertId: "${ruleAlertId}"`,
      page: 1,
    });
    if (
      notificationFromFind.data.length === 0 ||
      !legacyIsAlertType(notificationFromFind.data[0])
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
