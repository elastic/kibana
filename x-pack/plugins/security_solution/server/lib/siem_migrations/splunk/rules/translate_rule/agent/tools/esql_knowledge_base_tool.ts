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

const TOOL_NAME = 'esql_translator';
const schema = z.object({
  splQuery: z.string().describe(`The exact SPL query to translate to ES|QL`),
  title: z.string().describe(`The title of the splunk rule`),
  description: z.string().describe(`The description of the splunk rule`),
});
type Schema = typeof schema;
type SchemaInput = z.output<Schema>;

const toolParams = {
  name: TOOL_NAME,
  description: `You MUST use the "${TOOL_NAME}" function to convert queries from SPL language to ES|QL.
The output will contain the ES|QL equivalent inside a \`\`\`esql code block and a markdown summary of the translation process inside a \`\`\`markdown code block.

IMPORTANT: The SPL query must be passed directly without any wrapping or modification.
`,
  schema,
  tags: ['esql', 'query-translation', 'knowledge-base'],
};

const createInputPrompt = ({
  splQuery,
  title,
  description,
}: SchemaInput) => `Translate the following SPL (Search Processing Language) query to ES|QL in order to be used in a Security detection rule:

\`\`\`spl
${splQuery}
\`\`\`

This SPL query is part of a Splunk rule with the following title and description:

<SPLUNK_RULE_TITLE>
${title}
</SPLUNK_RULE_TITLE>

<SPLUNK_RULE_DESCRIPTION>
${description}
</SPLUNK_RULE_DESCRIPTION>

Along with the translated ES|QL query, you should also provide a summary of the translation process you followed, in markdown format.
The output will be parsed using a regular expression, please format the output using the following guidelines:

The summary of the translation process must be placed in a "markdown" code block, example:

\`\`\`markdown
[the summary goes here]
\`\`\`

The ES|QL translated query must be placed in a "esql" code block, example:

\`\`\`esql
[the translated query goes here]
\`\`\`
`;

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
  const callNaturalLanguageToEsql = async (input: SchemaInput) => {
    return lastValueFrom(
      naturalLanguageToEsql({
        client,
        connectorId,
        input: createInputPrompt(input),
        logger: {
          debug: (source) => {
            logger.debug(typeof source === 'function' ? source() : source);
          },
        },
      })
    );
  };

  const esqlKBTool = tool<Schema>(async (input) => {
    const generateEvent = await callNaturalLanguageToEsql(input);
    const answer = generateEvent.content ?? 'An error occurred in the tool';

    logger.debug(`Received response from NL to ESQL tool: ${answer}`);
    return answer;
  }, toolParams);

  return esqlKBTool;
};
