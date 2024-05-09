/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SentinelOneActionsClientOptions } from './sentinelone/sentinel_one_actions_client';
import type { ResponseActionsClient } from './lib/types';
import type { ResponseActionsClientOptions } from './lib/base_response_actions_client';
import { EndpointActionsClient } from './endpoint/endpoint_actions_client';
import { SentinelOneActionsClient } from './sentinelone/sentinel_one_actions_client';
import { UnsupportedResponseActionsAgentTypeError } from './errors';
import type { ResponseActionAgentType } from '../../../../../common/endpoint/service/response_actions/constants';
import type { CrowdstrikeActionsClientOptions } from './crowdstrike/crowdstrike_actions_client';
import { CrowdstrikeActionsClient } from './crowdstrike/crowdstrike_actions_client';

export type GetResponseActionsClientConstructorOptions = ResponseActionsClientOptions &
  SentinelOneActionsClientOptions &
  CrowdstrikeActionsClientOptions;

/**
 * Retrieve a response actions client for an agent type
 * @param agentType
 * @param constructorOptions
 *
 * @throws UnsupportedResponseActionsAgentTypeError
 */
export const getResponseActionsClient = (
  agentType: ResponseActionAgentType,
  constructorOptions: GetResponseActionsClientConstructorOptions
): ResponseActionsClient => {
  switch (agentType) {
    case 'endpoint':
      return new EndpointActionsClient(constructorOptions);
    case 'sentinel_one':
      return new SentinelOneActionsClient(constructorOptions);
    case 'crowdstrike':
      return new CrowdstrikeActionsClient(constructorOptions);
    default:
      throw new UnsupportedResponseActionsAgentTypeError(
        `Agent type [${agentType}] does not support response actions`
      );
  }
};
