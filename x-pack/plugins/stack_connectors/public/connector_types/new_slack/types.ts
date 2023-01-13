/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ExecutorSubActionPostMessageParams } from '../../../server/connector_types/new_slack/types';

export interface SlackActionParams {
  subAction: string;
  subActionParams: ExecutorSubActionPostMessageParams;
}

// export interface SlackConfig {
//   apiUrl: string;
//   projectKey: string;
// }

export interface SlackSecrets {
  token: string;
}
