/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SECURITY_SOLUTION_SAVED_OBJECT_INDEX } from '@kbn/core-saved-objects-server';
import type {
  SavedObject,
  SavedObjectsFindResponse,
  SavedObjectsType,
  SavedObjectsUpdateResponse,
} from '@kbn/core/server';
import { PromptResponse } from '@kbn/elastic-assistant-common';
import { FindPromptsResponse } from '@kbn/elastic-assistant-common/impl/schemas/prompts/find_prompts_route.gen';

export const assistantPromptsTypeName = 'elastic-ai-assistant-prompts';

export const assistantPromptsTypeMappings: SavedObjectsType['mappings'] = {
  properties: {
    id: {
      type: 'keyword',
    },
    is_default: {
      type: 'boolean',
    },
    is_shared: {
      type: 'boolean',
    },
    is_new_conversation_default: {
      type: 'boolean',
    },
    name: {
      type: 'keyword',
    },
    prompt_type: {
      type: 'keyword',
    },
    content: {
      type: 'keyword',
    },
    updated_at: {
      type: 'keyword',
    },
    updated_by: {
      type: 'keyword',
    },
    created_at: {
      type: 'keyword',
    },
    created_by: {
      type: 'keyword',
    },
  },
};

export const assistantPromptsType: SavedObjectsType = {
  name: assistantPromptsTypeName,
  indexPattern: SECURITY_SOLUTION_SAVED_OBJECT_INDEX,
  hidden: false,
  namespaceType: 'multiple-isolated',
  mappings: assistantPromptsTypeMappings,
};

export interface AssistantPromptSoSchema {
  created_at: string;
  created_by: string;
  content: string;
  is_default?: boolean;
  is_shared?: boolean;
  is_new_conversation_default?: boolean;
  name: string;
  prompt_type: string;
  updated_at: string;
  updated_by: string;
}

export const transformSavedObjectToAssistantPrompt = ({
  savedObject,
}: {
  savedObject: SavedObject<AssistantPromptSoSchema>;
}): PromptResponse => {
  const {
    version: _version,
    attributes: {
      /* eslint-disable @typescript-eslint/naming-convention */
      created_at,
      created_by,
      content,
      is_default,
      is_new_conversation_default,
      prompt_type,
      name,
      updated_by,
      updated_at,
      /* eslint-enable @typescript-eslint/naming-convention */
    },
    id,
  } = savedObject;

  return {
    createdAt: created_at,
    createdBy: created_by,
    content,
    name,
    promptType: prompt_type,
    isDefault: is_default,
    isNewConversationDefault: is_new_conversation_default,
    updatedAt: updated_at,
    updatedBy: updated_by,
    id,
  };
};

export const transformSavedObjectUpdateToAssistantPrompt = ({
  prompt,
  savedObject,
}: {
  prompt: PromptResponse;
  savedObject: SavedObjectsUpdateResponse<AssistantPromptSoSchema>;
}): PromptResponse => {
  const dateNow = new Date().toISOString();
  const {
    version: _version,
    attributes: {
      name,
      updated_by: updatedBy,
      content,
      prompt_type: promptType,
      is_new_conversation_default: isNewConversationDefault,
    },
    id,
    updated_at: updatedAt,
  } = savedObject;

  return {
    createdAt: prompt.createdAt,
    createdBy: prompt.createdBy,
    content: content ?? prompt.content,
    promptType: promptType ?? prompt.promptType,
    id,
    isDefault: prompt.isDefault,
    isNewConversationDefault: isNewConversationDefault ?? prompt.isNewConversationDefault,
    name: name ?? prompt.name,
    updatedAt: updatedAt ?? dateNow,
    updatedBy: updatedBy ?? prompt.updatedBy,
  };
};

export const transformSavedObjectsToFoundAssistantPrompt = ({
  savedObjectsFindResponse,
}: {
  savedObjectsFindResponse: SavedObjectsFindResponse<AssistantPromptSoSchema>;
}): FindPromptsResponse => {
  return {
    data: savedObjectsFindResponse.saved_objects.map((savedObject) =>
      transformSavedObjectToAssistantPrompt({ savedObject })
    ),
    page: savedObjectsFindResponse.page,
    perPage: savedObjectsFindResponse.per_page,
    total: savedObjectsFindResponse.total,
  };
};
