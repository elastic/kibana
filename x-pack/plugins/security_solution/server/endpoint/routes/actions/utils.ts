/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import { deepFreeze } from '@kbn/std';
import { get } from 'lodash';
import { CustomHttpRequestError } from '../../../utils/custom_http_request_error';
import { isActionSupportedByAgentType } from '../../../../common/endpoint/service/response_actions/is_response_action_supported';
import { EndpointAuthorizationError } from '../../errors';
import { fetchActionRequestById } from '../../services/actions/utils/fetch_action_request_by_id';
import type { SecuritySolutionRequestHandlerContext } from '../../../types';
import type {
  ResponseActionAgentType,
  ResponseActionsApiCommandNames,
} from '../../../../common/endpoint/service/response_actions/constants';

type CommandsWithFileAccess = Readonly<
  Record<ResponseActionsApiCommandNames, Readonly<Record<ResponseActionAgentType, boolean>>>
>;

// FYI: this object here should help to quickly catch instances where we might forget to update the
//      authz on the file info/download apis when a response action needs to support file downloads.
const COMMANDS_WITH_ACCESS_TO_FILES: CommandsWithFileAccess = deepFreeze<CommandsWithFileAccess>({
  'get-file': {
    endpoint: true,
    sentinel_one: true,
    crowdstrike: false,
  },
  execute: {
    endpoint: true,
    sentinel_one: false,
    crowdstrike: false,
  },
  'running-processes': {
    endpoint: false,
    sentinel_one: true,
    crowdstrike: false,
  },
  upload: {
    endpoint: false,
    sentinel_one: false,
    crowdstrike: false,
  },
  scan: {
    endpoint: false,
    sentinel_one: false,
    crowdstrike: false,
  },
  isolate: {
    endpoint: false,
    sentinel_one: false,
    crowdstrike: false,
  },
  unisolate: {
    endpoint: false,
    sentinel_one: false,
    crowdstrike: false,
  },
  'kill-process': {
    endpoint: false,
    sentinel_one: false,
    crowdstrike: false,
  },
  'suspend-process': {
    endpoint: false,
    sentinel_one: false,
    crowdstrike: false,
  },
  runscript: {
    endpoint: false,
    sentinel_one: false,
    crowdstrike: true,
  },
});

/**
 * Checks to ensure that the user has the correct authz for the response action associated with the action id.
 *
 * FYI: Additional check is needed because the File info and download APIs are used by multiple response actions,
 *      thus we want to ensure that we don't allow access to file associated with response actions the user does
 *      not have authz to.
 *
 * @param context
 * @param request
 */
export const ensureUserHasAuthzToFilesForAction = async (
  context: SecuritySolutionRequestHandlerContext,
  request: KibanaRequest
): Promise<void> => {
  const userAuthz = await (await context.securitySolution).getEndpointAuthz();
  const coreContext = await context.core;
  const esClient = coreContext.elasticsearch.client.asInternalUser;
  const { action_id: actionId } = request.params as { action_id: string };
  const {
    EndpointActions: {
      data: { command },
      input_type: agentType,
    },
  } = await fetchActionRequestById(esClient, actionId);

  // Check if command is supported by the agent type
  if (!isActionSupportedByAgentType(agentType, command, 'manual')) {
    throw new CustomHttpRequestError(
      `Response action [${command}] not supported for agent type [${agentType}]`,
      400
    );
  }

  // Check if the command is marked as having access to files
  if (!get(COMMANDS_WITH_ACCESS_TO_FILES, `${command}.${agentType}`, false)) {
    throw new CustomHttpRequestError(
      `Response action [${command}] for agent type [${agentType}] does not support file downloads`,
      400
    );
  }

  let hasAuthzToCommand = false;

  switch (command) {
    case 'get-file':
      hasAuthzToCommand = userAuthz.canWriteFileOperations;
      break;

    case 'execute':
      hasAuthzToCommand = userAuthz.canWriteExecuteOperations;
      break;

    case 'running-processes':
      hasAuthzToCommand = userAuthz.canGetRunningProcesses;
      break;
  }

  if (!hasAuthzToCommand) {
    throw new EndpointAuthorizationError();
  }
};
