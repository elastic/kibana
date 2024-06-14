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
import { JsonOutputParser, StringOutputParser } from '@langchain/core/output_parsers';
import { getESQLQueryColumns } from '@kbn/esql-utils';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import type { StateGraphArgs } from '@langchain/langgraph';
import { StateGraph } from '@langchain/langgraph';
import { APP_UI_ID } from '../../../../common';

export const ECS_MAIN_PROMPT = ChatPromptTemplate.fromMessages([
  [
    'system',
    `As an expert user of Elastic Security, please generate an accurate and valid ESQL query to detect the use case below. Your response should be formatted to be able to use immediately in an Elastic Security timeline or detection rule. Take your time with the answer, check your knowledge really well on all the functions I am asking for. For ES|QL answers specifically, you should only ever answer with what's available in your private knowledge. I cannot afford for queries to be inaccurate. Assume I am using the Elastic Common Schema and Elastic Agent. Under any circumstances wrap index in quotes.

    If multiple indices are matched please try to use wildcard to match all indices. If you are unsure about the index name, please refer to the context provided below.

Here is some context for you to reference for your task, read it carefully as you will get questions about it later:
<context>
<availableIndices>
{availableIndices}
</availableIndices>
</context>`,
  ],
  [
    'human',
    `{input}.

Example response format:
<example_response>
A: Please find the ESQL query below:
\`\`\`esql
FROM logs
| SORT @timestamp DESC
| LIMIT 5
\`\`\`
</example_response>"`,
  ],
  ['ai', 'Please find the ESQL query below:'],
]);

export type EsqlKnowledgeBaseToolParams = AssistantToolParams;

const toolDetails = {
  description:
    'Call this for knowledge on how to build an ESQL query, or answer questions about the ES|QL query language. Input must always be the query on a single line, with no other text. Only output valid ES|QL queries as described above. Do not add any additional text to describe your output.',
  id: 'esql-knowledge-base-tool',
  name: 'ESQLKnowledgeBaseTool',
};

export interface CategorizationState {
  rawSamples: string[];
  samples: string[];
  formattedSamples: string;
  ecsTypes: string;
  ecsCategories: string;
  exAnswer: string;
  lastExecutedChain: string;
  packageName: string;
  dataStreamName: string;
  errors: object;
  pipelineResults: object[];
  finalized: boolean;
  reviewed: boolean;
  currentPipeline: object;
  currentProcessors: object[];
  invalidCategorization: object;
  initialPipeline: object;
  result: object;
}

const graphState: StateGraphArgs<CategorizationState>['channels'] = {
  lastExecutedChain: {
    value: (x: string, y?: string) => y ?? x,
    default: () => '',
  },
  rawSamples: {
    value: (x: string[], y?: string[]) => y ?? x,
    default: () => [],
  },
  samples: {
    value: (x: string[], y?: string[]) => y ?? x,
    default: () => [],
  },
  formattedSamples: {
    value: (x: string, y?: string) => y ?? x,
    default: () => '',
  },
  ecsTypes: {
    value: (x: string, y?: string) => y ?? x,
    default: () => '',
  },
  ecsCategories: {
    value: (x: string, y?: string) => y ?? x,
    default: () => '',
  },
  exAnswer: {
    value: (x: string, y?: string) => y ?? x,
    default: () => '',
  },
  packageName: {
    value: (x: string, y?: string) => y ?? x,
    default: () => '',
  },
  dataStreamName: {
    value: (x: string, y?: string) => y ?? x,
    default: () => '',
  },
  finalized: {
    value: (x: boolean, y?: boolean) => y ?? x,
    default: () => false,
  },
  reviewed: {
    value: (x: boolean, y?: boolean) => y ?? x,
    default: () => false,
  },
  errors: {
    value: (x: object, y?: object) => y ?? x,
    default: () => ({}),
  },
  pipelineResults: {
    value: (x: object[], y?: object[]) => y ?? x,
    default: () => [{}],
  },
  currentPipeline: {
    value: (x: object, y?: object) => y ?? x,
    default: () => ({}),
  },
  currentProcessors: {
    value: (x: object[], y?: object[]) => y ?? x,
    default: () => [],
  },
  invalidCategorization: {
    value: (x: object, y?: object) => y ?? x,
    default: () => ({}),
  },
  initialPipeline: {
    value: (x: object, y?: object) => y ?? x,
    default: () => ({}),
  },
  result: {
    value: (x: object, y?: object) => y ?? x,
    default: () => ({}),
  },
};

function modelInput(state: CategorizationState): Partial<CategorizationState> {
  // const samples = modifySamples(state);
  // const formattedSamples = formatSamples(samples);
  // const initialPipeline = JSON.parse(JSON.stringify(state.currentPipeline));
  return {
    // exAnswer: JSON.stringify(CATEGORIZATION_EXAMPLE_ANSWER, null, 2),
    // ecsCategories: JSON.stringify(ECS_CATEGORIES, null, 2),
    // ecsTypes: JSON.stringify(ECS_TYPES, null, 2),
    // samples,
    // formattedSamples,
    // initialPipeline,
    finalized: false,
    reviewed: false,
    lastExecutedChain: 'modelInput',
  };
}

function modelOutput(state: CategorizationState): Partial<CategorizationState> {
  return {
    finalized: true,
    lastExecutedChain: 'modelOutput',
    result: {
      query: state.query,
      rows: state.pipelineResults,
      columns: state.currentPipeline,
    },
  };
}

const handleGenerateQuery = (state: CategorizationState, model) => {};

const getEsqlGraph = (client, model) => {
  const workflow = new StateGraph({
    channels: graphState,
  })
    .addNode('modelInput', modelInput)
    .addNode('modelOutput', modelOutput)
    .addNode('handleGenerateQuery', (state: CategorizationState) =>
      handleGenerateQuery(state, model)
    )
    .addNode('handleClassifyEsql', (state: CategorizationState) => {});
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

    const { chain, esClient, search, llm } = params as EsqlKnowledgeBaseToolParams;
    if (chain == null) return null;

    console.error('params', Object.keys(params));

    console.error('search', search);

    return new DynamicStructuredTool({
      name: toolDetails.name,
      description: toolDetails.description,
      schema: z.object({
        question: z.string().describe(`The user's exact question about ESQL`),
      }),
      func: async (input, _, cbManager) => {
        let response;
        try {
          response = await esClient.indices.getDataStream();
        } catch (e) {
          console.error('e', e);
        }

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

        // const indices = transformInputToOutput(response);

        const graph = ECS_MAIN_PROMPT.pipe(llm).pipe(new StringOutputParser());

        const result = await graph.invoke({
          input: input.question,
          availableIndices: JSON.stringify(
            response?.data_streams.map((item) => item.name),
            null,
            2
          ),
        });

        console.error('result', JSON.stringify(result, null, 2));

        const esqlQuery = result
          ?.match(/(?<=```esql)[\s\S]*?(?=```)/g)
          .join('')
          .replace('\n', '')
          .replaceAll('"', '')
          .trim();

        console.error('esqlQuery', esqlQuery);

        try {
          const esqlQueryColumns = await getESQLQueryColumns({ esqlQuery, search: search.search });
          console.error('esqlQueryColumns', esqlQueryColumns);
        } catch (e) {
          console.error('e', e);
        }

        console.error('trimee', result.replaceAll('"', '').trim());

        return result.replaceAll('"', '').trim();
      },
      tags: ['esql', 'query-generation', 'knowledge-base'],
    });
  },
};
