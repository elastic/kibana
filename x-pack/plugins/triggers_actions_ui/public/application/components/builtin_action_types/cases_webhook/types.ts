/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CasesWebhookPublicConfigurationType,
  CasesWebhookSecretConfigurationType,
  ExecutorSubActionPushParams,
} from '@kbn/stack-connectors-plugin/server/connector_types/cases/cases_webhook/types';
import { UserConfiguredActionConnector } from '../../../../types';

export interface CasesWebhookActionParams {
  subAction: string;
  subActionParams: ExecutorSubActionPushParams;
}

export type CasesWebhookConfig = CasesWebhookPublicConfigurationType;

export type CasesWebhookSecrets = CasesWebhookSecretConfigurationType;

export type CasesWebhookActionConnector = UserConfiguredActionConnector<
  CasesWebhookConfig,
  CasesWebhookSecrets
>;
