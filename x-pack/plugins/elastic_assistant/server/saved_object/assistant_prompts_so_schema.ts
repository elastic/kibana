/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';

import { versionOrUndefined } from '@kbn/securitysolution-io-ts-types';
import { SavedObjectsFindResponse } from '@kbn/core/server';
import { transformSavedObjectToAssistantPrompt } from './elastic_assistant_prompts_type';

export const assistantPromptSoSchema = t.exact(
  t.type({
    created_at: t.string,
    created_by: t.string,
    content: t.string,
    is_default: t.boolean,
    is_new_conversation_default: t.boolean,
    name: t.string,
    prompt_type: t.string,
    updated_by: t.string,
    version: versionOrUndefined,
  })
);

export type AssistantPromptSoSchema = t.TypeOf<typeof assistantPromptSoSchema>;

export const _version = t.string;
export const _versionOrUndefined = t.union([_version, t.undefined]);

export const assistantPromptSchema = t.exact(
  t.type({
    _version: _versionOrUndefined,
    created_at: t.string,
    created_by: t.string,
    content: t.string,
    is_default: t.boolean,
    is_new_conversation_default: t.boolean,
    name: t.string,
    prompt_type: t.string,
    updated_by: t.string,
    updated_at: t.string,
    id: t.string,
    version: versionOrUndefined,
  })
);

export type AssistantPromptSchema = t.TypeOf<typeof assistantPromptSchema>;

export const foundAssistantPromptSchema = t.intersection([
  t.exact(
    t.type({
      data: t.array(assistantPromptSchema),
      page: t.number,
      per_page: t.number,
      total: t.number,
    })
  ),
  t.exact(t.partial({})),
]);

export type FoundAssistantPromptSchema = t.TypeOf<typeof foundAssistantPromptSchema>;

export const transformSavedObjectsToFoundAssistantPrompt = ({
  savedObjectsFindResponse,
}: {
  savedObjectsFindResponse: SavedObjectsFindResponse<AssistantPromptSoSchema>;
}): FoundAssistantPromptSchema => {
  return {
    data: savedObjectsFindResponse.saved_objects.map((savedObject) =>
      transformSavedObjectToAssistantPrompt({ savedObject })
    ),
    page: savedObjectsFindResponse.page,
    per_page: savedObjectsFindResponse.per_page,
    total: savedObjectsFindResponse.total,
  };
};
