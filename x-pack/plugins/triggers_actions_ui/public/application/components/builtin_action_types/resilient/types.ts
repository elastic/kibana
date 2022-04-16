/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExecutorSubActionPushParams } from '@kbn/actions-plugin/server/builtin_action_types/resilient/types';
import { UserConfiguredActionConnector } from '../../../../types';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths

export type ResilientActionConnector = UserConfiguredActionConnector<
  ResilientConfig,
  ResilientSecrets
>;

export interface ResilientActionParams {
  subAction: string;
  subActionParams: ExecutorSubActionPushParams;
}

export interface ResilientConfig {
  apiUrl: string;
  orgId: string;
}

export interface ResilientSecrets {
  apiKeyId: string;
  apiKeySecret: string;
}
