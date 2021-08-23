/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from 'src/core/server';
import { schema } from '@kbn/config-schema';
import { NOTIFICATIONS_ID, SERVER_APP_ID } from '../../../../common/constants';

import { NotificationAlertTypeDefinition } from './types';
import { siemRuleActionGroups } from '../signals/siem_rule_action_groups';

// TODO: Can we remove this function/rule or could that cause issues?
// Do we have to find all rule instances and then delete it on startup and then remove it here?
export const rulesNotificationAlertType = ({
  logger,
}: {
  logger: Logger;
}): NotificationAlertTypeDefinition => ({
  id: NOTIFICATIONS_ID,
  name: 'SIEM notification',
  actionGroups: siemRuleActionGroups,
  defaultActionGroupId: 'default',
  producer: SERVER_APP_ID,
  validate: {
    params: schema.object({
      ruleAlertId: schema.string(),
    }),
  },
  minimumLicenseRequired: 'basic',
  isExportable: false,
  async executor() {
    // This is an old legacy dead RULE we don't use anymore since we have proper notifications
  },
});
