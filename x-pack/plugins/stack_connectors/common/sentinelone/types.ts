/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TypeOf } from '@kbn/config-schema';
import {
  SentinelOneBaseApiResponseSchema,
  SentinelOneConfigSchema,
  SentinelOneExecuteScriptParamsSchema,
  SentinelOneGetAgentsParamsSchema,
  SentinelOneGetAgentsResponseSchema,
  SentinelOneGetRemoteScriptsParamsSchema,
  SentinelOneGetRemoteScriptsResponseSchema,
  SentinelOneGetRemoteScriptsStatusParams,
  SentinelOneIsolateAgentParamsSchema,
  SentinelOneKillProcessParamsSchema,
  SentinelOneSecretsSchema,
  SentinelOneActionParamsSchema,
} from './schema';

export type SentinelOneConfig = TypeOf<typeof SentinelOneConfigSchema>;
export type SentinelOneSecrets = TypeOf<typeof SentinelOneSecretsSchema>;

export type SentinelOneBaseApiResponse = TypeOf<typeof SentinelOneBaseApiResponseSchema>;

export type SentinelOneGetAgentsParams = TypeOf<typeof SentinelOneGetAgentsParamsSchema>;
export type SentinelOneGetAgentsResponse = TypeOf<typeof SentinelOneGetAgentsResponseSchema>;

export type SentinelOneKillProcessParams = TypeOf<typeof SentinelOneKillProcessParamsSchema>;

export type SentinelOneExecuteScriptParams = TypeOf<typeof SentinelOneExecuteScriptParamsSchema>;

export type SentinelOneGetRemoteScriptStatusParams = TypeOf<
  typeof SentinelOneGetRemoteScriptsStatusParams
>;

export type SentinelOneGetRemoteScriptsParams = TypeOf<
  typeof SentinelOneGetRemoteScriptsParamsSchema
>;

export type SentinelOneGetRemoteScriptsResponse = TypeOf<
  typeof SentinelOneGetRemoteScriptsResponseSchema
>;

export type SentinelOneIsolateAgentParams = TypeOf<typeof SentinelOneIsolateAgentParamsSchema>;

export type SentinelOneActionParams = TypeOf<typeof SentinelOneActionParamsSchema>;
