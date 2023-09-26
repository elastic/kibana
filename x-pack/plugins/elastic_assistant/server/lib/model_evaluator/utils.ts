/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BaseChain } from 'langchain/dist/chains/base';
import { Logger } from '@kbn/logging';
import { ToolingLog } from '@kbn/tooling-log';

export const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const callAgentWithRetry = async (
  agent: BaseChain,
  query: string,
  logger: Logger | ToolingLog,
  maxRetries = 3
) => {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await agent.call({ query });
    } catch (error) {
      // Check for 429, and then if there is a retry-after header
      if (error.status === 429) {
        logger.error("Slow down! You're going too fast! 429 detected! Retrying after...");
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
      throw error;
    }
  }
  throw new Error('Max retries reached');
};
