/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { HttpSetup } from '@kbn/core/public';
import { INTERNAL_BASE_ALERTING_API_PATH } from '../../constants';
import { NotificationPolicy } from '../../sections/notifications_list/components/create_notification_policy_modal';

export async function createPolicy({
  http,
  policy,
}: {
  http: HttpSetup;
  policy: NotificationPolicy;
}): Promise<NotificationPolicy> {
  console.log(`policy ${JSON.stringify(policy)}`);
  return await http.post<NotificationPolicy>(`${INTERNAL_BASE_ALERTING_API_PATH}/policy`, {
    body: JSON.stringify(policy),
  });
}
