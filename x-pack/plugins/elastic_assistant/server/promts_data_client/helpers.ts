/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { estypes } from '@elastic/elasticsearch';
import {
  PromptResponse,
  PromptUpdateProps,
} from '@kbn/elastic-assistant-common/impl/schemas/prompts/bulk_crud_prompts_route.gen';
import { SearchEsPromptsSchema, UpdatePromptSchema } from './types';

export const transformESToPrompts = (
  response: estypes.SearchResponse<SearchEsPromptsSchema>
): PromptResponse[] => {
  return response.hits.hits
    .filter((hit) => hit._source !== undefined)
    .map((hit) => {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const promptSchema = hit._source!;
      const prompt: PromptResponse = {
        timestamp: promptSchema['@timestamp'],
        createdAt: promptSchema.created_at,
        users:
          promptSchema.users?.map((user) => ({
            id: user.id,
            name: user.name,
          })) ?? [],
        content: promptSchema.content,
        isDefault: promptSchema.is_default,
        isNewConversationDefault: promptSchema.is_new_conversation_default,
        updatedAt: promptSchema.updated_at,
        namespace: promptSchema.namespace,
        id: hit._id,
        name: promptSchema.name,
        promptType: promptSchema.prompt_type,
        isShared: promptSchema.is_shared,
        createdBy: promptSchema.created_by,
        updatedBy: promptSchema.updated_by,
      };

      return prompt;
    });
};

export const transformToUpdateScheme = (
  updatedAt: string,
  { content, isDefault, isNewConversationDefault, isShared }: PromptUpdateProps
): UpdatePromptSchema => {
  return {
    updated_at: updatedAt,
    content: content ?? '',
    is_new_conversation_default: isNewConversationDefault,
    is_shared: isShared,
  };
};

export const getUpdateScript = ({
  prompt,
  updatedAt,
  isPatch,
}: {
  prompt: PromptUpdateProps;
  updatedAt: string;
  isPatch?: boolean;
}) => {
  return {
    source: `
    if (params.assignEmpty == true || params.containsKey('content')) {
      ctx._source.content = params.content;
    }
    if (params.assignEmpty == true || params.containsKey('is_new_conversation_default')) {
      ctx._source.is_new_conversation_default = params.is_new_conversation_default;
    }
    if (params.assignEmpty == true || params.containsKey('is_shared')) {
      ctx._source.is_shared = params.is_shared;
    }
    ctx._source.updated_at = params.updated_at;
  `,
    lang: 'painless',
    params: {
      ...transformToUpdateScheme(updatedAt, prompt), // when assigning undefined in painless, it will remove property and wil set it to null
      // for patch we don't want to remove unspecified value in payload
      assignEmpty: !(isPatch ?? true),
    },
  };
};
