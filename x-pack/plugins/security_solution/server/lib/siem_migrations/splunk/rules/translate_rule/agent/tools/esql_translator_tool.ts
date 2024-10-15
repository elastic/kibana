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
  description: `ALWAYS use the "${TOOL_NAME}" tool to convert the Splunk detection rule (SPL) to an Elastic ES|QL query.`,
  schema,
  tags: ['esql', 'query-translation', 'knowledge-base'],
};

const createInputPrompt = ({
  splQuery,
  title,
  description,
}: SchemaInput) => `Translate the following Splunk SPL (Search Processing Language) query rule to an ES|QL query, in order to be used as an Elastic Security detection rule:

Splunk rule title: ${title}

Splunk rule description: ${description}

Splunk rule SPL query:
\`\`\`spl
${splQuery}
\`\`\`

Along with the translated ES|QL query, you should also provide a summary of the translation process you followed, in markdown format.
The output should contain:
- First, the ES|QL query inside an \`\`\`esql code block.
- At the end, the summary of the translation process followed in markdown, starting with "## Translation Summary".
`;

export type EsqlTranslatorTool = StructuredTool<Schema>;

interface GetEsqlTranslatorToolParams {
  inferenceClient: InferenceClient;
  connectorId: string;
  logger: Logger;
}
export const getEsqlTranslatorTool = ({
  inferenceClient: client,
  connectorId,
  logger,
}: GetEsqlTranslatorToolParams): EsqlTranslatorTool => {
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

  const esqlTool = tool<Schema>(async (input) => {
    const generateEvent = await callNaturalLanguageToEsql(input);
    const answer = generateEvent.content ?? 'An error occurred in the tool';

    logger.debug(`Received response from NL to ESQL tool: ${answer}`);
    return answer;
  }, toolParams);

  return esqlTool;
};
