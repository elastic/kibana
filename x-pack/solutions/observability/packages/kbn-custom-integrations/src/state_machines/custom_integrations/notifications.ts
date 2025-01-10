/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { NotificationChannel } from '@kbn/xstate-utils';
import { createNotificationChannel } from '@kbn/xstate-utils';
import type { CreateCustomIntegrationNotificationEvent } from '../create/notifications';
import type { CustomIntegrationsContext, CustomIntegrationsEvent } from './types';

export type CustomIntegrationsNotificationChannel = NotificationChannel<
  CustomIntegrationsContext,
  CustomIntegrationsEvent | CreateCustomIntegrationNotificationEvent,
  CustomIntegrationsEvent | CreateCustomIntegrationNotificationEvent
>;

export const createCustomIntegrationsNotificationChannel = () => {
  return createNotificationChannel<
    CustomIntegrationsContext,
    CustomIntegrationsEvent | CreateCustomIntegrationNotificationEvent,
    CustomIntegrationsEvent | CreateCustomIntegrationNotificationEvent
  >(false);
};
