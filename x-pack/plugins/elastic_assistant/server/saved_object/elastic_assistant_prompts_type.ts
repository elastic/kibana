/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SECURITY_SOLUTION_SAVED_OBJECT_INDEX } from '@kbn/core-saved-objects-server';
import type { SavedObject, SavedObjectsType, SavedObjectsUpdateResponse } from '@kbn/core/server';
import { AssistantPromptSchema, AssistantPromptSoSchema } from './assistant_prompts_so_schema';

export const assistantPromptsTypeName = 'elastic-ai-assistant-prompts';

export const assistantPromptsTypeMappings: SavedObjectsType['mappings'] = {
  properties: {
    id: {
      type: 'keyword',
    },
    isDefault: {
      type: 'boolean',
    },
    isNewConversationDefault: {
      type: 'boolean',
    },
    name: {
      type: 'keyword',
    },
    promptType: {
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

export const transformSavedObjectToAssistantPrompt = ({
  savedObject,
}: {
  savedObject: SavedObject<AssistantPromptSoSchema>;
}): AssistantPromptSchema => {
  const dateNow = new Date().toISOString();
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
      version,
      /* eslint-enable @typescript-eslint/naming-convention */
    },
    id,
    updated_at: updatedAt,
  } = savedObject;

  return {
    _version,
    created_at,
    created_by,
    content,
    id,
    name,
    prompt_type,
    is_default,
    is_new_conversation_default,
    updated_at: updatedAt ?? dateNow,
    updated_by,
    version: version ?? 1,
  };
};

export const transformSavedObjectUpdateToAssistantPrompt = ({
  prompt,
  savedObject,
}: {
  prompt: AssistantPromptSchema;
  savedObject: SavedObjectsUpdateResponse<AssistantPromptSoSchema>;
}): AssistantPromptSchema => {
  const dateNow = new Date().toISOString();
  const {
    version: _version,
    attributes: { name, updated_by: updatedBy, content, prompt_type: promptType, version },
    id,
    updated_at: updatedAt,
  } = savedObject;

  // TODO: Change this to do a decode and throw if the saved object is not as expected.
  // TODO: Do a throw if after the decode this is not the correct "list_type: list"
  // TODO: Update exception list and item types (perhaps separating out) so as to avoid
  // defaulting
  return {
    _version,
    created_at: prompt.created_at,
    created_by: prompt.created_by,
    content: content ?? prompt.content,
    prompt_type: promptType ?? prompt.prompt_type,
    version: version ?? prompt.version,
    id,
    is_default: prompt.is_default,
    is_new_conversation_default: prompt.is_new_conversation_default,
    name: name ?? prompt.name,
    updated_at: updatedAt ?? dateNow,
    updated_by: updatedBy ?? prompt.updated_by,
  };
};
