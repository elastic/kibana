/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RequestHandler } from '@kbn/core/server';
import type { CrowdstrikeActionsRequestBody } from '../../../../../common/api/endpoint/actions/response_actions/crowdstrike';
import type { RunScriptActionRequestBody } from '../../../../../common/api/endpoint/actions/response_actions/crowdstrike/run_script';
import { CustomHttpRequestError } from '../../../../utils/custom_http_request_error';
import type { SecuritySolutionRequestHandlerContext } from '../../../../types';
import type { EndpointAppContext } from '../../../types';
import type {
  CrowdStrikeActionDataParameterTypes,
  CrowdStrikeActionRunScriptOutputContent,
  CrowdStrikeActionsRunScriptParameters,
} from '../../../../../common/endpoint/types/crowdstrike';
import { createBaseActionRequestHandler } from '../base_response_actions_handler';
import type { ResponseActionsRequestBody } from '../../../../../common/api/endpoint';
import type { ResponseActionsClient } from '../../../services';
import type {
  EDRActionsApiCommandNames,
  ResponseActionAgentType,
  ResponseActionsApiCommandNames,
} from '../../../../../common/endpoint/service/response_actions/constants';
import type {
  ActionDetails,
  ActionDetailsAgentTypeMapping,
} from '../../../../../common/endpoint/types';

export function crowdStrikeActionRequestHandler<T extends CrowdStrikeActionDataParameterTypes>(
  endpointContext: EndpointAppContext,
  command: EDRActionsApiCommandNames<'crowdstrike'>
): RequestHandler<
  unknown,
  unknown,
  CrowdstrikeActionsRequestBody,
  SecuritySolutionRequestHandlerContext
> {
  const isCrowdstrikeFeatureEnabled = (
    agentType: ResponseActionAgentType | undefined,
    experimentalFeatures: EndpointAppContext['experimentalFeatures']
  ): boolean => {
    return (
      agentType === 'crowdstrike' &&
      experimentalFeatures.responseActionsCrowdstrikeManualHostIsolationEnabled
    );
  };

  return createBaseActionRequestHandler<'crowdstrike'>(
    endpointContext,
    command,
    isCrowdstrikeFeatureEnabled, // Custom validation
    handleCrowdstrikeActionCreation // Custom action creation
  );
}

const handleCrowdstrikeActionCreation = async (
  command: ResponseActionsApiCommandNames,
  body: ResponseActionsRequestBody,
  responseActionsClient: ResponseActionsClient
): Promise<
  ActionDetails<
    ActionDetailsAgentTypeMapping['crowdstrike']['output'],
    ActionDetailsAgentTypeMapping['crowdstrike']['parameters']
  >
> => {
  // For now, use a simplified logic or extend later
  if (command === 'runscript') {
    return responseActionsClient.runscript<
      RunScriptActionRequestBody,
      CrowdStrikeActionRunScriptOutputContent,
      CrowdStrikeActionsRunScriptParameters
    >(body as RunScriptActionRequestBody);
  }
  throw new CustomHttpRequestError(`Unsupported Crowdstrike command: [${command}]`, 501);
};
