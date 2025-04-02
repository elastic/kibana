/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { from, filter, shareReplay } from 'rxjs';
import { StreamEvent } from '@langchain/core/tracers/log_stream';
import type { Logger } from '@kbn/core/server';
import type { InferenceChatModel } from '@kbn/inference-langchain';
import type { Agent } from '../../../common/agents';
import { createAgentGraph } from './agent_graph';
import { langchainToChatEvents, conversationEventsToMessages } from './utils';
import type { AgentRunner, AgentRunResult } from './types';
import type { McpGatewaySession } from './mcp_gateway';

export const createAgentRunner = async ({
  logger,
  agent,
  chatModel,
  createSession,
}: {
  logger: Logger;
  agent: Agent;
  chatModel: InferenceChatModel;
  createSession: () => Promise<McpGatewaySession>;
}): Promise<AgentRunner> => {
  const session = await createSession();

  const closeSession = () => {
    session.close().catch((err) => {
      logger.warn(`Error disconnecting integrations: ${err.message}`);
    });
  };

  const agentGraph = await createAgentGraph({ agent, chatModel, session, logger });

  return {
    run: async ({ previousEvents }): Promise<AgentRunResult> => {
      const initialMessages = conversationEventsToMessages(previousEvents);

      const runName = 'defaultAgentGraph';

      const eventStream = agentGraph.streamEvents(
        { initialMessages },
        {
          version: 'v2',
          runName,
          metadata: {
            agentId: agent.id,
          },
          recursionLimit: 5,
        }
      );

      const events$ = from(eventStream).pipe(
        filter(isStreamEvent),
        langchainToChatEvents({ runName }),
        shareReplay()
      );

      events$.subscribe({
        complete: () => {
          closeSession();
        },
        error: () => {
          closeSession();
        },
      });

      return {
        events$,
      };
    },
  };
};

const isStreamEvent = (input: any): input is StreamEvent => {
  return 'event' in input;
};
