/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { naturalLanguageToEsql, type InferenceClient } from '@kbn/inference-plugin/server';
import type { StructuredTool } from '@langchain/core/tools';
import { tool } from '@langchain/core/tools';
import { lastValueFrom } from 'rxjs';
import { z } from '@kbn/zod';

const TOOL_NAME = 'answer_ESQL_questions';
const schema = z.object({
  question: z.string().describe(`The exact question about ES|QL`),
});
type Schema = typeof schema;

const toolParams = {
  name: TOOL_NAME,
  description: `You MUST use the "${TOOL_NAME}" function when the user wants to:
- run any arbitrary ES|QL query
- convert queries from another language to ES|QL
- asks general questions about ES|QL

DO NOT UNDER ANY CIRCUMSTANCES generate ES|QL queries or explain anything about the ES|QL query language yourself.
DO NOT UNDER ANY CIRCUMSTANCES try to correct an ES|QL query yourself - always use the "${TOOL_NAME}" function for this.

Even if the "${TOOL_NAME}" function was used before that, follow it up with the "${TOOL_NAME}" function. If a query fails, do not attempt to correct it yourself. Again you should call the "${TOOL_NAME}" function,
even if it has been called before.`,
  schema,
  tags: ['esql', 'query-generation', 'knowledge-base'],
};

export type ESQLKnowledgeBaseTool = StructuredTool<Schema>;

interface GetESQLKnowledgeBaseToolParams {
  inferenceClient: InferenceClient;
  connectorId: string;
  logger: Logger;
}
export const getESQLKnowledgeBaseTool = ({
  inferenceClient: client,
  connectorId,
  logger,
}: GetESQLKnowledgeBaseToolParams): ESQLKnowledgeBaseTool => {
  const callNaturalLanguageToEsql = async (question: string) => {
    return lastValueFrom(
      naturalLanguageToEsql({
        client,
        connectorId,
        input: question,
        logger: {
          debug: (source) => {
            logger.debug(typeof source === 'function' ? source() : source);
          },
        },
      })
    );
  };

  const esqlKBTool = tool<Schema>(async (input) => {
    const generateEvent = await callNaturalLanguageToEsql(input.question);
    const answer = generateEvent.content ?? 'An error occurred in the tool';

    logger.debug(`Received response from NL to ESQL tool: ${answer}`);
    return answer;
  }, toolParams);

  return esqlKBTool;
};
