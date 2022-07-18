/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SanitizedRule } from '@kbn/alerting-plugin/common';
import { SERVER_APP_ID, LEGACY_NOTIFICATIONS_ID } from '../../../../common/constants';
// eslint-disable-next-line no-restricted-imports
import type {
  CreateNotificationParams,
  LegacyRuleNotificationAlertTypeParams,
} from './legacy_types';

/**
 * @deprecated Once we are confident all rules relying on side-car actions SO's have been migrated to SO references we should remove this function
 */
export const legacyCreateNotifications = async ({
  rulesClient,
  actions,
  enabled,
  ruleAlertId,
  interval,
  name,
}: CreateNotificationParams): Promise<SanitizedRule<LegacyRuleNotificationAlertTypeParams>> =>
  rulesClient.create<LegacyRuleNotificationAlertTypeParams>({
    data: {
      name,
      tags: [],
      alertTypeId: LEGACY_NOTIFICATIONS_ID,
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
