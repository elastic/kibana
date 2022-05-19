/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @kbn/eslint/no-restricted-paths */

import { ExecutorSubActionPushParams } from '@kbn/actions-plugin/server/builtin_action_types/cases_webhook/types';
import { UserConfiguredActionConnector } from '../../../../types';

export interface CasesWebhookActionParams {
  subAction: string;
  subActionParams: ExecutorSubActionPushParams;
}

export interface CasesWebhookConfig {
  method: string;
  url: string;
  incidentJson: string;
  headers: Record<string, string>;
  hasAuth: boolean;
}

export interface CasesWebhookSecrets {
  user: string;
  password: string;
}

export type CasesWebhookActionConnector = UserConfiguredActionConnector<
  CasesWebhookConfig,
  CasesWebhookSecrets
>;
