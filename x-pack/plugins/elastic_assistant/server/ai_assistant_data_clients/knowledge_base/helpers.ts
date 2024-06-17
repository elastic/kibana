/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { AuthenticatedUser } from '@kbn/core-security-common';

export const isModelAlreadyExistsError = (error: Error) => {
  return (
    error instanceof errors.ResponseError &&
    (error.body.error.type === 'resource_not_found_exception' ||
      error.body.error.type === 'status_exception')
  );
};

/**
 * Returns an Elasticsearch query DSL that performs a vector search against the Knowledge Base for the given query/user/filter.
 *
 * @param filter - Optional filter to apply to the search
 * @param kbResource - Specific resource tag to filter for, e.g. 'esql' or 'user'
 * @param modelId - ID of the model to search with, e.g. `.elser_model_2`
 * @param query - The search query provided by the user
 * @param required - Whether to only include required entries
 * @param user - The authenticated user
 * @returns
 */
export const getKBVectorSearchQuery = ({
  filter,
  kbResource,
  modelId,
  query,
  required,
  user,
}: {
  filter?: QueryDslQueryContainer | undefined;
  kbResource?: string | undefined;
  modelId: string;
  query: string;
  required?: boolean | undefined;
  user: AuthenticatedUser;
}): QueryDslQueryContainer => {
  const resourceFilter = kbResource
    ? [
        {
          term: {
            'metadata.kbResource': kbResource,
          },
        },
      ]
    : [];
  const requiredFilter = required
    ? [
        {
          term: {
            'metadata.required': required,
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
