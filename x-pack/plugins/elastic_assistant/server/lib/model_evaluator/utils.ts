/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from '@kbn/logging';
import { ToolingLog } from '@kbn/tooling-log';
import { BaseMessage } from 'langchain/schema';
import { ResponseBody } from '../langchain/types';
import { AgentExecutorEvaluator } from '../langchain/executors/types';

export const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export interface CallAgentWithRetryParams {
  agent: AgentExecutorEvaluator;
  exampleId?: string;
  messages: BaseMessage[];
  logger: Logger | ToolingLog;
  maxRetries?: number;
}
export const callAgentWithRetry = async ({
  agent,
  exampleId,
  messages,
  logger,
  maxRetries = 3,
}: CallAgentWithRetryParams) => {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await agent(messages, exampleId);
    } catch (error) {
      // Check for 429, and then if there is a retry-after header
      const { isRateLimitError, retryAfter } = parseErrorMessage(error);
      if (isRateLimitError) {
        logger.error(
          "callAgentWithRetry: Slow down! You're going too fast! 429 detected! Retrying after..."
        );
        if (retryAfter != null) {
          logger.error(`${retryAfter} seconds`);
          await wait(retryAfter * 1000);
          // eslint-disable-next-line no-continue
          continue;
        }
      }
      // If not 429 or there is no retry-after header, reject the promise
      logger.error(`Error calling agent:\n${error}`);
      return Promise.reject(error);
    }
  }
  logger.error(`callAgentWithRetry: Max retries reached: ${maxRetries}`);
  // Reject and keep going!
  // eslint-disable-next-line prefer-promise-reject-errors
  return Promise.reject(`callAgentWithRetry: Max retries reached: ${maxRetries}`);
};

export const getMessageFromLangChainResponse = (
  response: PromiseSettledResult<ResponseBody>
): string => {
  if (response.status === 'fulfilled' && response.value.data != null) {
    return response.value.data;
  }
  return 'error';
};

/**
 * Parse an error message coming back from the agent via the actions frameworks to determine if it is
 * a rate limit error and extract the retry after delay.
 *
 * Note: Could be simplified by instrumenting agents w/ callback where there's access to the actual response
 * @param error
 */
export const parseErrorMessage = (
  error: Error
): { isRateLimitError: boolean; retryAfter: number | null } => {
  const errorMessage: string = error.message;

  const rateLimitRegex = /Status code: 429.*?Please retry after (\d+) seconds/;
  const match = errorMessage.match(rateLimitRegex);

  // If there is a match, return the parsed delay; otherwise, return an indication that it is not a 429 error.
  if (match && match[1]) {
    return { isRateLimitError: true, retryAfter: parseInt(match[1], 10) };
  } else {
    return { isRateLimitError: false, retryAfter: null };
  }
};
