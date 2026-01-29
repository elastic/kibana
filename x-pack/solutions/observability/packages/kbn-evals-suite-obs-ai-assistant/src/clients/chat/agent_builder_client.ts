/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolingLog } from '@kbn/tooling-log';
import type { HttpHandler } from '@kbn/core/public';
import { agentBuilderDefaultAgentId } from '@kbn/agent-builder-common';
import pRetry from 'p-retry';
import type { ChatClient, ConverseParams, ConverseResponse } from './types';

const RETRIES = 2;
const MIN_TIMEOUT = 2000;

export class AgentBuilderClient implements ChatClient {
  constructor(
    private readonly fetch: HttpHandler,
    private readonly log: ToolingLog,
    private readonly connectorId: string,
    private readonly agentId: string | undefined
  ) {}

  async converse(params: ConverseParams): Promise<ConverseResponse> {
    const { messages, conversationId } = params;
    this.log.info('Calling converse');

    const callConverseApi = async (): Promise<{
      conversationId?: string;
      messages: { message: string }[];
      errors: any[];
      steps?: any[];
    }> => {
      // Use the non-async Agent Builder API endpoint
      const response = await this.fetch('/api/agent_builder/converse', {
        method: 'POST',
        version: '2023-10-31',
        body: JSON.stringify({
          agent_id: this.agentId ?? agentBuilderDefaultAgentId,
          connector_id: this.connectorId,
          conversation_id: conversationId,
          input: messages,
        }),
      });

      // Extract conversation ID and response from the API response
      const chatResponse = response as {
        conversation_id: string;
        trace_id?: string;
        steps: any[];
        response: { message: string };
      };
      const {
        conversation_id: conversationIdFromResponse,
        response: latestResponse,
        steps,
      } = chatResponse;

      return {
        conversationId: conversationIdFromResponse,
        messages: [{ message: messages }, latestResponse],
        steps,
        errors: [],
      };
    };

    try {
      const result = await pRetry(callConverseApi, {
        retries: RETRIES,
        minTimeout: MIN_TIMEOUT,
        onFailedAttempt: (error) => {
          const isLastAttempt = error.attemptNumber === error.retriesLeft + error.attemptNumber;

          if (isLastAttempt) {
            this.log.error(
              new Error(`Failed to call converse API after ${error.attemptNumber} attempts`, {
                cause: error,
              })
            );
            throw error;
          } else {
            this.log.warning(
              new Error(`Converse API call failed on attempt ${error.attemptNumber}; retrying...`, {
                cause: error,
              })
            );
          }
        },
      });

      return {
        conversationId: result.conversationId,
        messages: result.messages.map((msg) => ({
          content: msg.message,
        })),
        errors: result.errors,
        steps: result.steps,
      };
    } catch (error) {
      this.log.error('Error occurred while calling converse API');
      return {
        conversationId,
        steps: [],
        messages: [
          {
            content: messages,
          },
          {
            content:
              'This question could not be answered as an internal error occurred. Please try again.',
          },
        ],
        errors: [
          {
            error: {
              message: error instanceof Error ? error.message : 'Unknown error',
              stack: error instanceof Error ? error.stack : undefined,
            },
            type: 'error',
          },
        ],
      };
    }
  }
}
