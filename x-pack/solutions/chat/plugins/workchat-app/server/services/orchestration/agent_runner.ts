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
import type { WorkChatTracingConfig } from '../../config';
import { createAgentGraph } from './agent_graph';
import { conversationEventsToMessages } from './utils';
import { convertGraphEvents } from './graph_events';
import type { AgentRunner, AgentRunResult } from './types';
import type { McpGatewaySession } from './mcp_gateway';
import { graphNames } from './constants';
import { getGraphMeta } from './graph_events';
import { getTracers } from './tracing';

export const createAgentRunner = async ({
  logger,
  agent,
  chatModel,
  createSession,
  tracingConfig,
}: {
  logger: Logger;
  agent: Agent;
  chatModel: InferenceChatModel;
  createSession: () => Promise<McpGatewaySession>;
  tracingConfig: WorkChatTracingConfig;
}): Promise<AgentRunner> => {
  const session = await createSession();
  const tracers = getTracers({ config: tracingConfig });

  const closeSession = () => {
    session.close().catch((err) => {
      logger.warn(`Error disconnecting integrations: ${err.message}`);
    });
  };

  const agentGraph = await createAgentGraph({
    agent,
    chatModel,
    session,
    logger: logger.get('agent.graph'),
  });

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
            ...getGraphMeta({ graphName: graphNames.mainAgent }),
            agentId: agent.id,
          },
          recursionLimit: 10,
          callbacks: [...tracers],
        }
      );

      const events$ = from(eventStream).pipe(
        filter(isStreamEvent),
        convertGraphEvents(),
        shareReplay()
      );

      events$.subscribe({
        complete: () => {
          logger.debug('Completed the event stream');
          closeSession();
        },
        error: () => {
          logger.debug('Encountered error in the event stream');
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
