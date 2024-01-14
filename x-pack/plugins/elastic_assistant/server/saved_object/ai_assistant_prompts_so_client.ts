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

import {
  AssistantPromptSoSchema,
  assistantPromptsTypeName,
  transformSavedObjectToAssistantPrompt,
  transformSavedObjectUpdateToAssistantPrompt,
  transformSavedObjectsToFoundAssistantPrompt,
} from './elastic_assistant_prompts_type';
import {
  PromptCreateProps,
  PromptResponse,
  PromptUpdateProps,
} from '../schemas/prompts/crud_prompts_route.gen';
import { FindPromptsResponse, SortOrder } from '../schemas/prompts/find_prompts_route.gen';

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
export class AIAssistantPromptsSOClient {
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
  public getPrompt = async (id: string): Promise<PromptResponse | null> => {
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
  }: PromptCreateProps): Promise<PromptResponse | null> => {
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
          updated_at: dateNow,
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
  public updatePromptItem = async (
    prompt: PromptResponse,
    { promptType, content, name, isNewConversationDefault }: PromptUpdateProps
  ): Promise<PromptResponse | null> => {
    const { savedObjectsClient, user } = this;
    const savedObject = await savedObjectsClient.update<AssistantPromptSoSchema>(
      assistantPromptsTypeName,
      prompt.id,
      {
        content,
        is_new_conversation_default: isNewConversationDefault,
        prompt_type: promptType,
        name,
        updated_by: user,
      }
    );
    return transformSavedObjectUpdateToAssistantPrompt({
      prompt,
      savedObject,
    });
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
   * Finds prompts given a set of criteria.
   * @param options
   * @param options.filter The filter to apply in the search
   * @param options.perPage How many per page to return
   * @param options.page The page number or "undefined" if there is no page number to continue from
   * @param options.pit The Point in Time (pit) id if there is one, otherwise "undefined" can be sent in
   * @param options.sortField The sort field string if there is one, otherwise "undefined" can be sent in
   * @param options.sortOrder The sort order of "asc" or "desc", otherwise "undefined" can be sent in
   * @returns The found prompts or null if nothing is found
   */
  public findPrompts = async ({
    perPage,
    page,
    sortField,
    sortOrder,
    filter,
    fields,
  }: {
    perPage: number;
    page: number;
    sortField?: string;
    sortOrder?: SortOrder;
    filter?: string;
    fields?: string[];
  }): Promise<FindPromptsResponse> => {
    const { savedObjectsClient } = this;

    const savedObjectsFindResponse = await savedObjectsClient.find<AssistantPromptSoSchema>({
      filter,
      page,
      perPage,
      sortField,
      sortOrder,
      type: assistantPromptsTypeName,
      fields,
    });

    return transformSavedObjectsToFoundAssistantPrompt({ savedObjectsFindResponse });
  };
}
