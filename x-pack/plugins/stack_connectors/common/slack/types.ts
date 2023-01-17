/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TypeOf } from '@kbn/config-schema';
import {
  SlackConfigSchema,
  SlackSecretsSchema,
  ExecutorPostMessageParamsSchema,
  ExecutorParamsSchema,
} from './schema';

export type SlackConfig = TypeOf<typeof SlackConfigSchema>;
export type SlackSecrets = TypeOf<typeof SlackSecretsSchema>;

export type SubAction = 'postMessage' | 'getChannels';

// export interface SlackExecuteActionParams {
//   subAction: SubAction;
//   subActionParams: SlackExecuteSubActionParams;
// }

export type SlackExecuteActionParams = TypeOf<typeof ExecutorParamsSchema>;
export type ExecutorPostMessageParams = TypeOf<typeof ExecutorPostMessageParamsSchema>;

export interface GetChannelsResponse {
  ok: true;
  channels: Array<{
    id: string;
    name: string;
    is_channel: boolean;
    is_archived: boolean;
    is_private: boolean;
  }>;
}
