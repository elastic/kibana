/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from '@kbn/logging';
import { ToolingLog } from '@kbn/tooling-log';
import { BaseMessage } from 'langchain/schema';
import { ResponseBody } from '../langchain/helpers';
import { AgentExecutorEvaluator } from '../langchain/executors/types';

export const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export interface CallAgentWithRetryParams {
  agent: AgentExecutorEvaluator;
  messages: BaseMessage[];
  logger: Logger | ToolingLog;
  maxRetries?: number;
}
export const callAgentWithRetry = async ({
  agent,
  messages,
  logger,
  maxRetries = 3,
}: CallAgentWithRetryParams) => {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await agent(messages);
    } catch (error) {
      // Check for 429, and then if there is a retry-after header
      if (error.status === 429) {
        logger.error(
          "callAgentWithRetry: Slow down! You're going too fast! 429 detected! Retrying after..."
        );
        const retryAfter = error.headers?.['retry-after'];
        if (retryAfter) {
          const retryAfterNum = parseInt(retryAfter, 10);
          logger.error(`${retryAfterNum} seconds}`);
          await wait(retryAfterNum * 1000);
          // eslint-disable-next-line no-continue
          continue;
        }
      }
      // If not 429 or there is no retry-after header, reject the promise
      logger.error(`Error calling agent:\n${error}`);
      throw error;
    }
  }
  logger.error(`callAgentWithRetry: Max retries reached: ${maxRetries}`);
  throw new Error(`callAgentWithRetry: Max retries reached: ${maxRetries}`);
};

export const getMessageFromLangChainResponse = (
  response: PromiseSettledResult<ResponseBody>
): string => {
  if (response.status === 'fulfilled') {
    const choices = response.value.data.choices;

    if (Array.isArray(choices) && choices.length > 0 && choices[0].message.content) {
      const result: string = choices[0].message.content.trim();

      return getFormattedMessageContent(result);
    }
  }
  return 'error';
};

/**
 * Lifted from `x-pack/packages/kbn-elastic-assistant/impl/assistant/helpers.ts`
 * TODO: Move this to a shared location
 *
 * When `content` is a JSON string, prefixed with "```json\n"
 * and suffixed with "\n```", this function will attempt to parse it and return
 * the `action_input` property if it exists.
 */
export const getFormattedMessageContent = (content: string): string => {
  const formattedContentMatch = content.match(/```json\n([\s\S]+)\n```/);

  if (formattedContentMatch) {
    try {
      const parsedContent = JSON.parse(formattedContentMatch[1]);

      return parsedContent.action_input ?? content;
    } catch {
      // we don't want to throw an error here, so we'll fall back to the original content
    }
  }

  return content;
};
