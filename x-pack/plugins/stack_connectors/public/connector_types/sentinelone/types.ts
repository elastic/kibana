/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  SentinelOneKillProcessParams,
  SentinelOneExecuteScriptParams,
  SentinelOneIsolateAgentParams,
} from '../../../common/sentinelone/types';
import type { SUB_ACTION } from '../../../common/sentinelone/constants';

export type SentinelOneExecuteSubActionParams =
  | SentinelOneKillProcessParams
  | SentinelOneExecuteScriptParams
  | SentinelOneIsolateAgentParams;

export interface SentinelOneExecuteActionParams {
  subAction: SUB_ACTION;
  subActionParams: SentinelOneExecuteSubActionParams;
}
