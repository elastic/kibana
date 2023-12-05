/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  Logger,
  SavedObjectsErrorHelpers,
  type SavedObjectsClientContract,
} from '@kbn/core/server';

import { SortResults } from '@elastic/elasticsearch/lib/api/types';
import {
  assistantPromptsTypeName,
  transformSavedObjectToAssistantPrompt,
  transformSavedObjectUpdateToAssistantPrompt,
} from './elastic_assistant_prompts_type';
import {
  AssistantPromptSchema,
  AssistantPromptSoSchema,
  FoundAssistantPromptSchema,
  transformSavedObjectsToFoundAssistantPrompt,
} from './assistant_prompts_so_schema';

export interface AssistantPromptsCreateOptions {
  /** The comments of the endpoint list item */
  content: string;
  /** The entries of the endpoint list item */
  promptType: string;
  /** The entries of the endpoint list item */
  name: string;
  /** The entries of the endpoint list item */
  isDefault?: boolean;
  /** The entries of the endpoint list item */
  isNewConversationDefault?: boolean;
}

export interface AssistantPromptsUpdateOptions {
  /** The comments of the endpoint list item */
  content: string;
  /** The entries of the endpoint list item */
  promptType: string;
  /** The entries of the endpoint list item */
  name: string;
  /** The entries of the endpoint list item */
  isDefault?: boolean;
  /** The entries of the endpoint list item */
  isNewConversationDefault?: boolean;
  id: string;
  _version: string;
}

export interface FindAssistantPromptsOptions {
  /** The filter to apply in the search */
  filter?: string;
  /** How many per page to return */
  perPage: number;
  /** The page number or "undefined" if there is no page number to continue from */
  page: number;
  /** The search_after parameter if there is one, otherwise "undefined" can be sent in */
  searchAfter?: SortResults;
  /** The sort field string if there is one, otherwise "undefined" can be sent in */
  sortField?: string;
  /** The sort order of "asc" or "desc", otherwise "undefined" can be sent in */
  sortOrder?: 'asc' | 'desc';
}

export interface ConstructorOptions {
  /** User creating, modifying, deleting, or updating the prompts */
  user: string;
  /** Saved objects client to create, modify, delete, the prompts */
  savedObjectsClient: SavedObjectsClientContract;
  logger: Logger;
}

/**
 * Class for use for prompts that are used for AI assistant.
 */
export class AIAssistantSOClient {
  /** User creating, modifying, deleting, or updating the prompts */
  private readonly user: string;

  /** Saved objects client to create, modify, delete, the prompts */
  private readonly savedObjectsClient: SavedObjectsClientContract;

  /**
   * Constructs the assistant client
   * @param options
   * @param options.user The user associated with the action for exception list
   * @param options.savedObjectsClient The saved objects client to create, modify, delete, an AI prompts
   */
  constructor({ user, savedObjectsClient }: ConstructorOptions) {
    this.user = user;
    this.savedObjectsClient = savedObjectsClient;
  }

  /**
   * Fetch an exception list parent container
   * @param options
   * @param options.id the "id" of an exception list
   * @returns The found exception list or null if none exists
   */
  public getPrompt = async (id: string): Promise<AssistantPromptSchema | null> => {
    const { savedObjectsClient } = this;
    if (id != null) {
      try {
        const savedObject = await savedObjectsClient.get<AssistantPromptSoSchema>(
          assistantPromptsTypeName,
          id
        );
        return transformSavedObjectToAssistantPrompt({ savedObject });
      } catch (err) {
        if (SavedObjectsErrorHelpers.isNotFoundError(err)) {
          return null;
        } else {
          throw err;
        }
      }
    } else {
      return null;
    }
  };

  /**
   * This creates an agnostic space endpoint list if it does not exist. This tries to be
   * as fast as possible by ignoring conflict errors and not returning the contents of the
   * list if it already exists.
   * @returns AssistantPromptSchema if it created the endpoint list, otherwise null if it already exists
   */
  public createPrompt = async ({
    promptType,
    content,
    name,
    isDefault,
    isNewConversationDefault,
  }: AssistantPromptsCreateOptions): Promise<AssistantPromptSchema | null> => {
    const { savedObjectsClient, user } = this;

    const dateNow = new Date().toISOString();
    try {
      const savedObject = await savedObjectsClient.create<AssistantPromptSoSchema>(
        assistantPromptsTypeName,
        {
          created_at: dateNow,
          created_by: user,
          content,
          name,
          is_default: isDefault ?? false,
          is_new_conversation_default: isNewConversationDefault ?? false,
          prompt_type: promptType,
          updated_by: user,
          version: 1,
        }
      );
      return transformSavedObjectToAssistantPrompt({ savedObject });
    } catch (err) {
      if (SavedObjectsErrorHelpers.isConflictError(err)) {
        return null;
      } else {
        throw err;
      }
    }
  };

  /**
   * This is the same as "updateExceptionListItem" except it applies specifically to the endpoint list and will
   * auto-call the "createEndpointList" for you so that you have the best chance of the endpoint
   * being there if it did not exist before. If the list did not exist before, then creating it here will still cause a
   * return of null but at least the list exists again.
   * @param options
   * @param options._version The version to update the endpoint list item to
   * @param options.comments The comments of the endpoint list item
   * @param options.description The description of the endpoint list item
   * @param options.entries The entries of the endpoint list item
   * @param options.id The id of the list item (Either this or itemId has to be defined)
   * @param options.itemId The item id of the list item (Either this or id has to be defined)
   * @param options.meta Optional meta data of the list item
   * @param options.name The name of the list item
   * @param options.osTypes The OS type of the list item
   * @param options.tags Tags of the endpoint list item
   * @param options.type The type of the endpoint list item (Default is "simple")
   * @returns The exception list item updated, otherwise null if not updated
   */
  public updatePromptItem = async ({
    promptType,
    content,
    name,
    isDefault,
    isNewConversationDefault,
    id,
    _version,
  }: AssistantPromptsUpdateOptions): Promise<AssistantPromptSchema | null> => {
    const { savedObjectsClient, user } = this;
    const prompt = await this.getPrompt(id);
    if (prompt == null) {
      return null;
    } else {
      const savedObject = await savedObjectsClient.update<AssistantPromptSoSchema>(
        assistantPromptsTypeName,
        prompt.id,
        {
          content,
          is_default: isDefault,
          is_new_conversation_default: isNewConversationDefault,
          prompt_type: promptType,
          name,
          updated_by: user,
        },
        {
          version: _version,
        }
      );
      return transformSavedObjectUpdateToAssistantPrompt({
        prompt,
        savedObject,
      });
    }
  };

  /**
   * Delete the prompt by id
   * @param options
   * @param options.id the "id" of the prompt
   */
  public deletePromptById = async (id: string): Promise<void> => {
    const { savedObjectsClient } = this;

    await savedObjectsClient.delete(assistantPromptsTypeName, id);
  };

  /**
   * Finds exception lists given a set of criteria.
   * @param options
   * @param options.filter The filter to apply in the search
   * @param options.perPage How many per page to return
   * @param options.page The page number or "undefined" if there is no page number to continue from
   * @param options.pit The Point in Time (pit) id if there is one, otherwise "undefined" can be sent in
   * @param options.searchAfter The search_after parameter if there is one, otherwise "undefined" can be sent in
   * @param options.sortField The sort field string if there is one, otherwise "undefined" can be sent in
   * @param options.sortOrder The sort order of "asc" or "desc", otherwise "undefined" can be sent in
   * @returns The found exception lists or null if nothing is found
   */
  public findPrompts = async ({
    filter,
    perPage,
    page,
    searchAfter,
    sortField,
    sortOrder,
  }: FindAssistantPromptsOptions): Promise<FoundAssistantPromptSchema> => {
    const { savedObjectsClient } = this;

    const savedObjectsFindResponse = await savedObjectsClient.find<AssistantPromptSoSchema>({
      filter,
      page,
      perPage,
      searchAfter,
      sortField,
      sortOrder,
      type: assistantPromptsTypeName,
    });

    return transformSavedObjectsToFoundAssistantPrompt({ savedObjectsFindResponse });
  };
}
