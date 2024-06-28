/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Fs from 'fs';
import { keyBy, mapValues, once, pick, isEmpty, map } from 'lodash';
import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import pLimit from 'p-limit';
import Path from 'path';
import type { AssistantTool, AssistantToolParams } from '@kbn/elastic-assistant-plugin/server';
import { JsonOutputParser, StringOutputParser } from '@langchain/core/output_parsers';
import type { StateGraphArgs } from '@langchain/langgraph';
import { END, START, StateGraph } from '@langchain/langgraph';
import type { BaseMessage } from '@langchain/core/messages';
import type { RunnableConfig } from '@langchain/core/runnables';
import type { ValidationResult } from '@kbn/esql-validation-autocomplete/src/validation/types';
import { getESQLQueryColumns } from '@kbn/esql-utils';
import { promisify } from 'util';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { validateQuery } from '@kbn/esql-validation-autocomplete';
import { getAstAndSyntaxErrors } from '@kbn/esql-ast';
import { APP_UI_ID } from '../../../../common';
import { correctCommonEsqlMistakes } from './correct_common_esql_mistakes';
import type { LangchainZodAny } from '..';

export const INLINE_ESQL_QUERY_REGEX = /```esql\s*(.*?)\s*```/gms;

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
FROM logs-*
| SORT @timestamp DESC
| LIMIT 5
\`\`\`
</example_response>"`,
  ],
  ['ai', 'Please find the ESQL query below:'],
]);

export type GraphESQLToolParams = AssistantToolParams;

const TOOL_NAME = 'GraphESQLTool';

const toolDetails = {
  id: 'graph-esql-tool',
  name: TOOL_NAME,
  description: `You MUST use the "${TOOL_NAME}" function when the user wants to:
  - visualize data
  - run any arbitrary query
  - breakdown or filter ES|QL queries that are displayed on the current page
  - convert queries from another language to ES|QL
  - asks general questions about ES|QL

  DO NOT UNDER ANY CIRCUMSTANCES generate ES|QL queries or explain anything about the ES|QL query language yourself.
  DO NOT UNDER ANY CIRCUMSTANCES try to correct an ES|QL query yourself - always use the "${TOOL_NAME}" function for this.

  If the user asks for a query, and one of the dataset info functions was called and returned no results, you should still call the query function to generate an example query.

  Even if the "${TOOL_NAME}" function was used before that, follow it up with the "${TOOL_NAME}" function. If a query fails, do not attempt to correct it yourself. Again you should call the "${TOOL_NAME}" function,
  even if it has been called before.`,
};

interface IState {
  messages: BaseMessage[];
  esqlQuery: string;
  documentation: {
    functions: string[];
    commands: string[];
    intention: string;
  };
  errors: ValidationResult['errors'];
  availableIndices: string[];
  invalidQueries: string[];
}

// This defines the agent state
const graphState: StateGraphArgs<IState>['channels'] = {
  messages: {
    value: (x: BaseMessage[], y: BaseMessage[]) => x.concat(y),
    default: () => [],
  },
  esqlQuery: {
    value: (x: string, y?: string) => y ?? x,
    default: () => '',
  },
  documentation: {
    value: (
      x: {
        functions: string[];
        commands: string[];
        intention: string;
      },
      y?: {
        functions: string[];
        commands: string[];
        intention: string;
      }
    ) => y ?? x,
    default: () => ({
      functions: [],
      commands: [],
      intention: '',
    }),
  },
  errors: {
    value: (x, y) => (y && !y.length ? y : x.concat(y)),
    default: () => [],
  },
  invalidQueries: {
    value: (x, y) => x.concat(y),
    default: () => [],
  },
  availableIndices: {
    value: (x, y) => y ?? x,
    default: () => [],
  },
};

const readFile = promisify(Fs.readFile);
const readdir = promisify(Fs.readdir);

const loadSystemMessage = once(async () => {
  const data = await readFile(
    Path.join(
      __dirname,
      '../../../../../observability_solution/observability_ai_assistant_app/server/functions/query/system_message.txt'
    )
  );
  return data.toString('utf-8');
});

const loadEsqlDocs = once(async () => {
  const dir = Path.join(
    __dirname,
    '../../../../../observability_solution/observability_ai_assistant_app/server/functions/query/esql_docs'
  );
  const files = (await readdir(dir)).filter((file) => Path.extname(file) === '.txt');

  if (!files.length) {
    return {};
  }

  const limiter = pLimit(10);
  return keyBy(
    await Promise.all(
      files.map((file) =>
        limiter(async () => {
          const data = (await readFile(Path.join(dir, file))).toString('utf-8');
          const filename = Path.basename(file, '.txt');

          const keyword = filename
            .replace('esql-', '')
            .replace('agg-', '')
            .replaceAll('-', '_')
            .toUpperCase();

          return {
            keyword: keyword === 'STATS_BY' ? 'STATS' : keyword,
            data,
          };
        })
      )
    ),
    'keyword'
  );
});

const getClassifyEsql =
  ({
    userQuery,
    llm,
    esClient,
  }: {
    userQuery: string;
    llm: NonNullable<AssistantToolParams['llm']>;
    esClient: AssistantToolParams['esClient'];
  }) =>
  async (state: IState, config?: RunnableConfig) => {
    const [systemMessage, esqlDocs] = await Promise.all([loadSystemMessage(), loadEsqlDocs()]);

    const formatInstructions = `Respond only in valid JSON. The JSON object you return should match the following schema:
  {{ commands: [], functions: [], intention: string }}

  Where commands is a list of processing or source commands that are referenced in the list of commands in this conversation.
  Where functions is a list of functions that are referenced in the list of functions in this conversation.
  Where intention is the user\'s intention.
  `;

    const prompt = await ChatPromptTemplate.fromMessages([
      [
        'system',
        `${systemMessage} Answer the user query. Wrap the output in \`json\` tags\n{format_instructions}`,
      ],
      [
        'user',
        `Use this function to determine:
      - what ES|QL functions and commands are candidates for answering the user's question
      - whether the user has requested a query, and if so, it they want it to be executed, or just shown.

      All parameters are required. Make sure the functions and commands you request are available in the
      system message.

      {query}
      `,
      ],
    ]).partial({
      format_instructions: formatInstructions,
    });

    // Set up a parser
    const parser = new JsonOutputParser();

    const chainss = prompt.pipe(llm).pipe(parser);

    const result = await chainss.invoke({
      query: userQuery,
      date: 'date',
      msg: 'msg',
      ip: 'ip',
    });

    const keywords = [
      ...(result.commands ?? []),
      ...(result.functions ?? []),
      'SYNTAX',
      'OVERVIEW',
      'OPERATORS',
    ].map((keyword) => keyword.toUpperCase());

    const messagesToInclude = mapValues(
      pick(esqlDocs, keywords),
      ({ data }) => data
    ) as unknown as IState['documentation'];

    const allDataStreams = await esClient.indices.getDataStream();

    return {
      documentation: messagesToInclude,
      availableIndices: map(allDataStreams.data_streams, 'name'),
    };
  };

const getGenerateQuery =
  ({ userQuery, llm }: { userQuery: string; llm: NonNullable<AssistantToolParams['llm']> }) =>
  async (state: IState) => {
    const [systemMessage] = await Promise.all([loadSystemMessage()]);

    const answerPrompt = await ChatPromptTemplate.fromMessages([
      [
        'system',
        `${systemMessage}\nDocumentation: {documentation}\nAvailable indices: {availableIndices}`,
      ],
      [
        'user',
        `Answer the user's question that was previously asked ("{query}...") using the attached documentation. Take into account any previous errors {errors} and invalid ES|QL queries {invalidQueries}.

          Format any ES|QL query as follows:
          \`\`\`esql
          <query>
          \`\`\`

          Respond in plain text. Do not attempt to use a function.

          You must use commands and functions for which you have requested documentation.

          DO NOT UNDER ANY CIRCUMSTANCES generate more than a single query.
          If multiple queries are needed, do it as a follow-up step. Make this clear to the user. For example:

          Human: plot both yesterday's and today's data.

          Assistant: Here's how you can plot yesterday's data:
          \`\`\`esql
          <query>
          \`\`\`

          Let's see that first. We'll look at today's data next.

          Human: <response from yesterday's data>

          Assistant: Let's look at today's data:

          \`\`\`esql
          <query>
          \`\`\`

          DO NOT UNDER ANY CIRCUMSTANCES use commands or functions that are not a capability of ES|QL
          as mentioned in the system message and documentation. When converting queries from one language
          to ES|QL, make sure that the functions are available and documented in ES|QL.
          E.g., for SPL's LEN, use LENGTH. For IF, use CASE.
        `,
      ],
    ]).partial({
      documentation: JSON.stringify(state.documentation),
      availableIndices: JSON.stringify(state.availableIndices),
      errors: state.errors.join('\n'),
      invalidQueries: state.invalidQueries.join('\n'),
    });

    const finalChain = answerPrompt.pipe(llm).pipe(new StringOutputParser());

    const finalResult = await finalChain.invoke({
      query: userQuery,
      date: 'date',
      msg: 'msg',
      ip: 'ip',
    });

    const correctedResult = finalResult.replaceAll(INLINE_ESQL_QUERY_REGEX, (_match, query) => {
      const correction = correctCommonEsqlMistakes(query);

      return `\`\`\`esql\n${correction.output}\n\`\`\``;
    });

    const esqlQuery = correctedResult.match(new RegExp(INLINE_ESQL_QUERY_REGEX, 'ms'))?.[1];

    return { answer: correctedResult, esqlQuery };
  };

const getValidateQuery =
  ({ search }: { search: AssistantToolParams['search'] }) =>
  async (state: IState, config?: RunnableConfig) => {
    const { errors } = await validateQuery(state.esqlQuery, getAstAndSyntaxErrors, {
      // setting this to true, we don't want to validate the index / fields existence
      ignoreOnMissingCallbacks: true,
    });

    if (!isEmpty(errors)) {
      return { errors, invalidQueries: [state.esqlQuery] };
    }

    try {
      await getESQLQueryColumns({
        esqlQuery: state.esqlQuery,
        search: search.search,
      });
      return { errors: [] };
    } catch (e) {
      return { errors: [e?.message], invalidQueries: [state.esqlQuery] };
    }
  };

const shouldRegenerate = (state: IState) => {
  if (state.errors?.length) {
    return 'generateQuery';
  }

  return END;
};

export const GRAPH_ESQL_TOOL: AssistantTool = {
  ...toolDetails,
  sourceRegister: APP_UI_ID,
  isSupported: () => true,
  getTool(params: AssistantToolParams) {
    if (!this.isSupported(params)) return null;

    const { chain, esClient, search, llm } = params;
    if (!llm || !chain) return null;

    return new DynamicStructuredTool({
      name: toolDetails.name,
      description: toolDetails.description,
      schema: z.object({
        question: z.string().describe(`The user's exact question about ESQL`),
      }) as unknown as LangchainZodAny,
      func: async (input, _, cbManager) => {
        const workflow = new StateGraph<IState>({
          channels: graphState,
        })
          .addNode('classifyEsql', getClassifyEsql({ userQuery: input.question, llm, esClient }))
          .addNode('generateQuery', getGenerateQuery({ userQuery: input.question, llm }))
          .addNode('validateQuery', getValidateQuery({ search }))
          .addEdge(START, 'classifyEsql')
          .addEdge('classifyEsql', 'generateQuery')
          .addEdge('generateQuery', 'validateQuery')
          .addConditionalEdges('validateQuery', shouldRegenerate);

        const app = workflow.compile();

        let query;
        try {
          query = await app.invoke({ question: input.question }, { recursionLimit: 20 });
        } catch (e) {
          // Fallback to KnowledgeBase tool
          const result = await chain.invoke(
            {
              query: input.question,
            },
            cbManager
          );
          return result.text;
        }

        return query.esqlQuery;
      },
      tags: ['esql', 'query-generation', 'knowledge-base'],
    });
  },
};
