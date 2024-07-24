/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import { isActionSupportedByAgentType } from '../../../../common/endpoint/service/response_actions/is_response_action_supported';
import { EndpointAuthorizationError } from '../../errors';
import { fetchActionRequestById } from '../../services/actions/utils/fetch_action_request_by_id';
import type { SecuritySolutionRequestHandlerContext } from '../../../types';

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
  const isCommandSupportedByAgentType = isActionSupportedByAgentType(agentType, command, 'manual');
  let hasAccess = false;
  const message = isCommandSupportedByAgentType
    ? ''
    : `Response action not supported for agent type`;

  if (isCommandSupportedByAgentType) {
    switch (command) {
      case 'get-file':
        hasAccess = userAuthz.canWriteFileOperations;
        break;

      case 'execute':
        hasAccess = userAuthz.canWriteExecuteOperations;
        break;

      case 'running-processes':
        hasAccess = userAuthz.canGetRunningProcesses;
        break;
    }
  }

  if (!hasAccess) {
    throw new EndpointAuthorizationError({ message });
  }
};
