/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import type { AssistantTool, AssistantToolParams } from '@kbn/elastic-assistant-plugin/server';
import { forOwn, get } from 'lodash';
import { JsonOutputParser } from '@langchain/core/output_parsers';
import { getESQLQueryColumns } from '@kbn/esql-utils';
import { APP_UI_ID } from '../../../../common';

export type EsqlKnowledgeBaseToolParams = AssistantToolParams;

const toolDetails = {
  description:
    'Call this for knowledge on how to build an ESQL query, or answer questions about the ES|QL query language. Input must always be the query on a single line, with no other text. Only output valid ES|QL queries as described above. Do not add any additional text to describe your output.',
  id: 'esql-knowledge-base-tool',
  name: 'ESQLKnowledgeBaseTool',
};
export const ESQL_KNOWLEDGE_BASE_TOOL: AssistantTool = {
  ...toolDetails,
  sourceRegister: APP_UI_ID,
  isSupported: (params: AssistantToolParams): params is EsqlKnowledgeBaseToolParams => {
    const { chain, isEnabledKnowledgeBase, modelExists } = params;
    return isEnabledKnowledgeBase && modelExists && chain != null;
  },
  getTool(params: AssistantToolParams) {
    if (!this.isSupported(params)) return null;

    const { chain, esClient, search } = params as EsqlKnowledgeBaseToolParams;
    if (chain == null) return null;

    console.error('search', search);

    return new DynamicStructuredTool({
      name: toolDetails.name,
      description: toolDetails.description,
      schema: z.object({
        question: z.string().describe(`The user's exact question about ESQL`),
      }),
      func: async (input, _, cbManager) => {
        console.error('input.questions', input);
        const response = await esClient.indices.get({ index: '*' });

        console.error('response', JSON.stringify(response, null, 2));

        function transformInputToOutput(input2: Record<string, any>) {
          const output: Record<string, any> = {};

          forOwn(input2, (value, _key) => {
            const key = Object.keys(value.aliases)[0] || _key;
            const properties = get(value, 'mappings.properties', {});
            output[key] = transformProperties(properties);
          });

          return output;
        }

        function transformProperties(properties) {
          const result: Record<string, any> = {};

          forOwn(properties, (value, key) => {
            if (value.type) {
              result[key] = value.type;
            } else if (value.properties) {
              result[key] = transformProperties(value.properties);
            } else if (value.fields) {
              result[key] = { fields: {} };
              forOwn(value.fields, (fieldValue, fieldKey) => {
                result[key].fields[fieldKey] = { type: fieldValue.type };
                if (fieldValue.ignore_above !== undefined) {
                  result[key].fields[fieldKey].ignore_above = fieldValue.ignore_above;
                }
              });
            } else {
              result[key] = value;
            }
          });

          return result;
        }

        const indices = transformInputToOutput(response);

        const result = await chain.invoke(
          {
            query: `
            CONTEXT:\`\`\`
            Available indices: ${JSON.stringify(Object.keys(indices), null, 2)}
            Object where the key is the name of the index and the value is the mapping: ${JSON.stringify(
              indices
            )}.
            \`\`\`

            ${input.question}
            `,
          },
          cbManager
        );

        console.error('result', JSON.stringify(result, null, 2));

        const esqlQuery = result.text
          .match(/(?<=""")[\s\S]*?(?=""")/g)
          .join('')
          .replace('\n', '')
          .trim();

        try {
          const esqlQueryColumns = await getESQLQueryColumns({ esqlQuery, search });
          console.error('esqlQueryColumns', esqlQueryColumns);
        } catch (e) {
          console.error('e', e);
        }

        return result.text;
      },
      tags: ['esql', 'query-generation', 'knowledge-base'],
    });
  },
};
