/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty, map, without } from 'lodash';
import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import type { AssistantTool, AssistantToolParams } from '@kbn/elastic-assistant-plugin/server';
import { StringOutputParser } from '@langchain/core/output_parsers';
import type { StateGraphArgs } from '@langchain/langgraph';
import { END, START, StateGraph } from '@langchain/langgraph';
import type { BaseMessage } from '@langchain/core/messages';
import type { RunnableConfig } from '@langchain/core/runnables';
import { getESQLQueryColumns, getIndexPatternFromESQLQuery } from '@kbn/esql-utils';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { validateQuery } from '@kbn/esql-validation-autocomplete';
import type { EditorError, ESQLMessage } from '@kbn/esql-ast';
import { getAstAndSyntaxErrors } from '@kbn/esql-ast';
import type {
  ActionsClientChatOpenAI,
  ActionsClientLlm,
  ActionsClientSimpleChatModel,
} from '@kbn/langchain/server';
import type { ElasticsearchStore } from '@kbn/elastic-assistant-plugin/server/lib/langchain/elasticsearch_store/elasticsearch_store';
import { APP_UI_ID } from '../../../../common';
import { correctCommonEsqlMistakes } from './correct_common_esql_mistakes';
import type { LangchainZodAny } from '..';

export const INLINE_ESQL_QUERY_REGEX = /```esql\s*(.*?)\s*```/gms;

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
  errors: string[];
  availableDataViews: string[];
  dataViewFields: string[];
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
  errors: {
    value: (x, y) => (y && !y.length ? y : x.concat(y)),
    default: () => [],
  },
  invalidQueries: {
    value: (x, y) => x.concat(y),
    default: () => [],
  },
  availableDataViews: {
    value: (x, y) => y ?? x,
    default: () => [],
  },
  dataViewFields: {
    value: (x, y) => y ?? x,
    default: () => [],
  },
};

const getDataStreams =
  ({ dataViews }: { dataViews: AssistantToolParams['dataViews'] }) =>
  async () => {
    const allDataStreams = await dataViews?.getTitles();

    return {
      availableDataViews: allDataStreams,
    };
  };

const getGenerateQuery =
  ({
    userQuery,
    llm,
    esStore,
  }: {
    userQuery: string;
    llm: ActionsClientLlm | ActionsClientChatOpenAI | ActionsClientSimpleChatModel;
    esStore?: ElasticsearchStore;
  }) =>
  async (state: IState) => {
    const knowledgeBaseDocs = (await esStore?.similaritySearch(userQuery)) ?? [];
    const documentation = map(knowledgeBaseDocs, 'pageContent').join('\n');

    const answerPrompt = await ChatPromptTemplate.fromMessages([
      [
        'system',
        `As an expert user of Elastic Security, please generate an accurate and valid ESQL query to detect the use case below. Your response should be formatted to be able to use immediately in an Elastic Security timeline or detection rule. Take your time with the answer, check your knowledge really well on all the functions I am asking for. For ES|QL answers specifically, you should only ever answer with what's available in your private knowledge. I cannot afford for queries to be inaccurate. Assume I am using the Elastic Common Schema and Elastic Agent. Under any circumstances wrap index in quotes.

        If multiple indices are matched please try to use wildcard to match all indices. If you are unsure about the index name, please refer to the context provided below.

        ES|QL documentation:
        {documentation}

        Available indices:
        {availableDataViews}
        `,
      ],
      [
        'user',
        `Answer the user's question that was previously asked ("{query}..."). Take into account any previous errors:
{errors}

and invalid ES|QL queries:
{invalidQueries}

If errors were related to "Unknown column" make sure to check the Available index fields:
{dataViewFields}

Format any ES|QL query as follows:
<format>
\`\`\`esql
<query>
\`\`\`
</format>

Respond in plain text. Do not attempt to use a function.

DO NOT UNDER ANY CIRCUMSTANCES generate more than a single query.
If multiple queries are needed, do it as a follow-up step. Make this clear to the user. For example:

Human: plot both yesterday's and today's data.

Assistant: Here's how you can plot yesterday's data:
<format>
\`\`\`esql
<query>
\`\`\`
</format>

Let's see that first. We'll look at today's data next.

Human: <response from yesterday's data>

Assistant: Let's look at today's data:

<format>
\`\`\`esql
<query>
\`\`\`
</format>

DO NOT UNDER ANY CIRCUMSTANCES use commands or functions that are not a capability of ES|QL
as mentioned in the system message. When converting queries from one language
to ES|QL, make sure that the functions are available and documented in ES|QL.
E.g., for SPL's LEN, use LENGTH. For IF, use CASE.`,
      ],
      ['ai', 'Please find the ESQL query below:'],
    ]).partial({
      documentation,
      availableDataViews: state.availableDataViews.join('\n'),
      errors: state.errors.join('\n'),
      dataViewFields: state.dataViewFields.join('\n'),
      invalidQueries: state.invalidQueries.join('\n'),
    });

    const finalChain = answerPrompt
      .pipe(llm as ActionsClientChatOpenAI | ActionsClientSimpleChatModel)
      .pipe(new StringOutputParser());

    const finalResult = await finalChain.invoke({
      query: userQuery,
    });

    const correctedResult = finalResult.replaceAll(INLINE_ESQL_QUERY_REGEX, (_match, query) => {
      const correction = correctCommonEsqlMistakes(query);

      return `\`\`\`esql\n${correction.output}\n\`\`\``;
    });

    const esqlQuery = correctedResult.match(new RegExp(INLINE_ESQL_QUERY_REGEX, 'ms'))?.[1];

    return { answer: correctedResult, esqlQuery };
  };

const getValidateQuery =
  ({
    dataViews,
    search,
  }: {
    dataViews: AssistantToolParams['dataViews'];
    search: AssistantToolParams['search'];
  }) =>
  async (state: IState, config?: RunnableConfig) => {
    const { errors } = await validateQuery(state.esqlQuery, getAstAndSyntaxErrors, {
      // setting this to true, we don't want to validate the index / fields existence
      ignoreOnMissingCallbacks: true,
    });

    if (!isEmpty(errors)) {
      return {
        errors: map(
          errors,
          (error) => (error as ESQLMessage)?.text || (error as EditorError)?.message
        ),
        invalidQueries: [state.esqlQuery],
      };
    }

    if (search?.search) {
      try {
        await getESQLQueryColumns({
          esqlQuery: state.esqlQuery,
          search: search.search,
        });
        return { errors: [] };
      } catch (e) {
        let dataViewFields;
        let availableDataViews = state.availableDataViews;
        if (dataViews) {
          const indexPattern = getIndexPatternFromESQLQuery(state.esqlQuery);
          let indexFields;
          try {
            indexFields = await dataViews.getFieldsForWildcard({ pattern: indexPattern });
          } catch (err) {
            availableDataViews = without(availableDataViews, indexPattern);
          }

          dataViewFields = map(indexFields, (field) => `${field.name} (${field.type})`);
        }

        return {
          errors: e?.message.match(new RegExp(/Unknown column.*/)) ?? e?.message,
          dataViewFields,
          availableDataViews,
          invalidQueries: [state.esqlQuery],
        };
      }
    }

    return {};
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
  isSupported: (params: AssistantToolParams): params is AssistantToolParams => {
    const { kbDataClient, isEnabledKnowledgeBase, modelExists } = params;
    return isEnabledKnowledgeBase && modelExists && kbDataClient != null;
  },
  getTool(params: AssistantToolParams) {
    if (!this.isSupported(params)) return null;

    const { dataViews, search, llm, esStore } = params;
    if (!llm) return null;

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
          .addNode('getDataStreams', getDataStreams({ dataViews }))
          .addNode('generateQuery', getGenerateQuery({ userQuery: input.question, llm, esStore }))
          .addNode('validateQuery', getValidateQuery({ dataViews, search }))
          .addEdge(START, 'getDataStreams')
          .addEdge('getDataStreams', 'generateQuery')
          .addEdge('generateQuery', 'validateQuery')
          .addConditionalEdges('validateQuery', shouldRegenerate);

        const app = workflow.compile();

        let query;
        try {
          query = await app.invoke({ question: input.question });
        } catch (e) {
          return e;
        }

        return query.esqlQuery;
      },
      tags: ['esql', 'query-generation', 'knowledge-base'],
    });
  },
};
