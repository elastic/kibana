/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { DynamicStructuredTool } from '@langchain/core/tools';
import { errors } from '@elastic/elasticsearch';
import { QueryDslQueryContainer, SearchRequest } from '@elastic/elasticsearch/lib/api/types';
import { AuthenticatedUser } from '@kbn/core-security-common';
import { IndexEntry } from '@kbn/elastic-assistant-common';
import { ElasticsearchClient, Logger } from '@kbn/core/server';

export const isModelAlreadyExistsError = (error: Error) => {
  return (
    error instanceof errors.ResponseError &&
    (error.body.error.type === 'resource_not_found_exception' ||
      error.body.error.type === 'status_exception')
  );
};

/**
 * Returns an Elasticsearch query DSL that performs a vector search against the Knowledge Base for the given query/user/filter. Searches only for DocumentEntries, not IndexEntries as they have no content.
 *
 * @param filter - Optional filter to apply to the search
 * @param kbResource - Specific resource tag to filter for, e.g. 'esql' or 'user'
 * @param modelId - ID of the model to search with, e.g. `.elser_model_2`
 * @param query - The search query provided by the user
 * @param required - Whether to only include required entries
 * @param user - The authenticated user
 * @param v2KnowledgeBaseEnabled whether the new v2 KB is enabled
 * @returns
 */
export const getKBVectorSearchQuery = ({
  filter,
  kbResource,
  modelId,
  query,
  required,
  user,
  v2KnowledgeBaseEnabled = false,
}: {
  filter?: QueryDslQueryContainer | undefined;
  kbResource?: string | undefined;
  modelId: string;
  query: string;
  required?: boolean | undefined;
  user: AuthenticatedUser;
  v2KnowledgeBaseEnabled: boolean;
}): QueryDslQueryContainer => {
  const kbResourceKey = v2KnowledgeBaseEnabled ? 'kb_resource' : 'metadata.kbResource';
  const requiredKey = v2KnowledgeBaseEnabled ? 'required' : 'metadata.required';
  const resourceFilter = kbResource
    ? [
        {
          term: {
            [kbResourceKey]: kbResource,
          },
        },
      ]
    : [];
  const requiredFilter = required
    ? [
        {
          term: {
            [requiredKey]: required,
          },
        },
      ]
    : [];

  const userFilter = [
    {
      nested: {
        path: 'users',
        query: {
          bool: {
            must: [
              {
                match: user.profile_uid
                  ? { 'users.id': user.profile_uid }
                  : { 'users.name': user.username },
              },
            ],
          },
        },
      },
    },
  ];

  return {
    bool: {
      must: [
        {
          text_expansion: {
            'vector.tokens': {
              model_id: modelId,
              model_text: query,
            },
          },
        },
        ...requiredFilter,
        ...resourceFilter,
        ...userFilter,
      ],
      filter,
    },
  };
};

/**
 * Returns a StructuredTool for a given IndexEntry
 */
export const getStructuredToolForIndexEntry = ({
  indexEntry,
  esClient,
  logger,
  elserId,
}: {
  indexEntry: IndexEntry;
  esClient: ElasticsearchClient;
  logger: Logger;
  elserId: string;
}): DynamicStructuredTool => {
  const inputSchema = indexEntry.inputSchema?.reduce((prev, input) => {
    const fieldType =
      input.fieldType === 'string'
        ? z.string()
        : input.fieldType === 'number'
        ? z.number()
        : input.fieldType === 'boolean'
        ? z.boolean()
        : z.any();
    return { ...prev, [input.fieldName]: fieldType.describe(input.description) };
  }, {});

  return new DynamicStructuredTool({
    name: indexEntry.name.replaceAll(' ', ''), // Tool names cannot contain spaces, further sanitization possibly needed
    description: indexEntry.description,
    schema: z.object({
      query: z.string().describe(indexEntry.queryDescription),
      ...inputSchema,
    }),
    func: async (input, _, cbManager) => {
      logger.debug(
        () => `Generated ${indexEntry.name} Tool:input\n ${JSON.stringify(input, null, 2)}`
      );

      // Generate filters for inputSchema fields
      const filter =
        indexEntry.inputSchema?.reduce((prev, i) => {
          return [
            ...prev,
            // @ts-expect-error Possible to override types with dynamic input schema?
            { term: { [`${i.fieldName}`]: input?.[i.fieldName] } },
          ];
        }, [] as Array<{ term: { [key: string]: string } }>) ?? [];

      const params: SearchRequest = {
        index: indexEntry.index,
        size: 10,
        retriever: {
          standard: {
            query: {
              nested: {
                path: 'semantic_text.inference.chunks',
                query: {
                  sparse_vector: {
                    inference_id: elserId,
                    field: `${indexEntry.field}.inference.chunks.embeddings`,
                    query: input.query,
                  },
                },
                inner_hits: {
                  size: 2,
                  name: `${indexEntry.name}.${indexEntry.field}`,
                  _source: [`${indexEntry.field}.inference.chunks.text`],
                },
              },
            },
            filter,
          },
        },
      };

      try {
        const result = await esClient.search(params);

        const kbDocs = result.hits.hits.map((hit) => {
          if (indexEntry.outputFields && indexEntry.outputFields.length > 0) {
            return indexEntry.outputFields.reduce((prev, field) => {
              // @ts-expect-error
              return { ...prev, [field]: hit._source[field] };
            }, {});
          }
          return {
            text: (hit._source as { text: string }).text,
          };
        });

        logger.debug(() => `Similarity Search Params:\n ${JSON.stringify(params)}`);
        logger.debug(() => `Similarity Search Results:\n ${JSON.stringify(result)}`);
        logger.debug(() => `Similarity Text Extract Results:\n ${JSON.stringify(kbDocs)}`);

        return `###\nBelow are all relevant documents in JSON format:\n${JSON.stringify(
          kbDocs
        )}\n###`;
      } catch (e) {
        logger.error(`Error performing IndexEntry KB Similarity Search: ${e.message}`);
        return `I'm sorry, but I was unable to find any information in the knowledge base. Perhaps this error would be useful to deliver to the user. Be sure to print it below your response and in a codeblock so it is rendered nicely: ${e.message}`;
      }
    },
    tags: ['knowledge-base'],
    // TODO: Remove after ZodAny is fixed https://github.com/langchain-ai/langchainjs/blob/main/langchain-core/src/tools.ts
  }) as unknown as DynamicStructuredTool;
};
