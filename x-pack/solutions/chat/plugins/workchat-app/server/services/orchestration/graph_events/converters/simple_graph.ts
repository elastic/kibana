/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AIMessageChunk } from '@langchain/core/messages';
import { StreamEvent as LangchainEvent } from '@langchain/core/tracers/log_stream';
import type { ToolResultEvent } from '../../../../../common/chat_events';
import { extractTextContent, messageFromLangchain } from '../../utils/from_langchain_messages';
import { AgentRunEvents } from '../../types';
import { matchGraphName } from '../utils';
import type { EventConverter } from './types';

/**
 * Returns a converter that will handle events for "simple" type of graph (base non-composite graphs).
 */
export const getSimpleGraphConverter = ({ graphName }: { graphName: string }): EventConverter => {
  const handleEvent = (event: LangchainEvent): boolean => {
    return matchGraphName(event, graphName);
  };

  const convert = (event: LangchainEvent): AgentRunEvents[] => {
    // stream text chunks for the UI
    if (event.event === 'on_chat_model_stream') {
      const chunk: AIMessageChunk = event.data.chunk;
      const content = extractTextContent(chunk);
      if (content) {
        return [
          {
            type: 'message_chunk',
            content_chunk: content,
            message_id: chunk.id ?? event.run_id,
          },
        ];
      }
    }

    // emit full message on each agent step
    if (event.event === 'on_chain_end' && event.name === 'agent') {
      const addedMessages = event.data.output.addedMessages;
      const lastMessage = addedMessages[addedMessages.length - 1];
      return [{ type: 'message', message: messageFromLangchain(lastMessage) }];
    }

    // emit tool result events
    if (event.event === 'on_tool_end' && event.metadata?.langgraph_node === 'tools') {
      return [
        {
          type: 'tool_result',
          toolResult: {
            callId: event.data.output.tool_call_id,
            result: event.data.output.content,
          },
        } as ToolResultEvent,
      ];
    }

    return [];
  };

  return { handleEvent, convert };
};
