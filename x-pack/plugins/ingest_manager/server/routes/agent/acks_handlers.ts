/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// handlers that handle events from agents in response to actions received

import { RequestHandler } from 'kibana/server';
import { AcksService } from '../../services/agents';
import { AgentEvent } from '../../../common/types/models';
import { PostAgentAcksRequest, PostAgentAcksResponse } from '../../../common/types/rest_spec';
import { defaultIngestErrorHandler } from '../../errors';

export const postAgentAcksHandlerBuilder = function (
  ackService: AcksService
): RequestHandler<PostAgentAcksRequest['params'], undefined, PostAgentAcksRequest['body']> {
  return async (context, request, response) => {
    try {
      const soClient = ackService.getSavedObjectsClientContract(request);
      const agent = await ackService.authenticateAgentWithAccessToken(soClient, request);
      const agentEvents = request.body.events as AgentEvent[];

      // validate that all events are for the authorized agent obtained from the api key
      const notAuthorizedAgentEvent = agentEvents.filter(
        (agentEvent) => agentEvent.agent_id !== agent.id
      );

      if (notAuthorizedAgentEvent && notAuthorizedAgentEvent.length > 0) {
        return response.badRequest({
          body:
            'agent events contains events with different agent id from currently authorized agent',
        });
      }

      const agentActions = await ackService.acknowledgeAgentActions(soClient, agent, agentEvents);

      if (agentActions.length > 0) {
        await ackService.saveAgentEvents(soClient, agentEvents);
      }

      const body: PostAgentAcksResponse = {
        action: 'acks',
      };

      return response.ok({ body });
    } catch (error) {
      return defaultIngestErrorHandler({ error, response });
    }
  };
};
