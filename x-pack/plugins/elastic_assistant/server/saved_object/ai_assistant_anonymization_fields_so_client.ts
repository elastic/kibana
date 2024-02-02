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
  SavedObjectsBulkDeleteStatus,
} from '@kbn/core/server';

import {
  AnonymizationFieldCreateProps,
  AnonymizationFieldResponse,
  AnonymizationFieldUpdateProps,
} from '@kbn/elastic-assistant-common/impl/schemas/anonymization_fields/bulk_crud_anonymization_fields_route.gen';
import {
  FindAnonymizationFieldsResponse,
  SortOrder,
} from '@kbn/elastic-assistant-common/impl/schemas/anonymization_fields/find_anonymization_fields_route.gen';
import {
  AssistantAnonymizationFieldSoSchema,
  assistantAnonymizationFieldsTypeName,
  transformSavedObjectToAssistantAnonymizationField,
  transformSavedObjectUpdateToAssistantAnonymizationField,
  transformSavedObjectsToFoundAssistantAnonymizationField,
} from './elastic_assistant_anonymization_fields_type';

export interface ConstructorOptions {
  /** User creating, modifying, deleting, or updating the anonymization fields */
  user: string;
  /** Saved objects client to create, modify, delete, the anonymization fields */
  savedObjectsClient: SavedObjectsClientContract;
  logger: Logger;
}

/**
 * Class for use for anonymization fields that are used for AI assistant.
 */
export class AIAssistantAnonymizationFieldsSOClient {
  /** User creating, modifying, deleting, or updating the anonymization fields */
  private readonly user: string;

  /** Saved objects client to create, modify, delete, the anonymization fields */
  private readonly savedObjectsClient: SavedObjectsClientContract;

  /**
   * Constructs the assistant client
   * @param options
   * @param options.user The user associated with the anonymization fields
   * @param options.savedObjectsClient The saved objects client to create, modify, delete, an AI anonymization fields
   */
  constructor({ user, savedObjectsClient }: ConstructorOptions) {
    this.user = user;
    this.savedObjectsClient = savedObjectsClient;
  }

  /**
   * Fetch an anonymization field
   * @param options
   * @param options.id the "id" of an exception list
   * @returns The found exception list or null if none exists
   */
  public getAnonymizationField = async (id: string): Promise<AnonymizationFieldResponse | null> => {
    const { savedObjectsClient } = this;
    if (id != null) {
      try {
        const savedObject = await savedObjectsClient.get<AssistantAnonymizationFieldSoSchema>(
          assistantAnonymizationFieldsTypeName,
          id
        );
        return transformSavedObjectToAssistantAnonymizationField({ savedObject });
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
   * @returns AssistantAnonymizationFieldSchema if it created the endpoint list, otherwise null if it already exists
   */
  public createAnonymizationFields = async (
    items: AnonymizationFieldCreateProps[]
  ): Promise<AnonymizationFieldResponse[]> => {
    const { savedObjectsClient, user } = this;

    const dateNow = new Date().toISOString();
    try {
      const formattedItems = items.map((item) => {
        return {
          attributes: {
            created_at: dateNow,
            created_by: user,
            field_id: item.fieldId,
            default_allow: item.defaultAllow ?? false,
            default_allow_replacement: item.defaultAllowReplacement ?? false,
            updated_by: user,
            updated_at: dateNow,
          },
          type: assistantAnonymizationFieldsTypeName,
        };
      });
      const savedObjectsBulk =
        await savedObjectsClient.bulkCreate<AssistantAnonymizationFieldSoSchema>(formattedItems);

      const result = savedObjectsBulk.saved_objects.map((savedObject) =>
        transformSavedObjectToAssistantAnonymizationField({ savedObject })
      );
      return result;
    } catch (err) {
      if (SavedObjectsErrorHelpers.isConflictError(err)) {
        return [];
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
  public updateAnonymizationFields = async (
    items: AnonymizationFieldUpdateProps[]
  ): Promise<AnonymizationFieldResponse[]> => {
    const { savedObjectsClient, user } = this;
    const dateNow = new Date().toISOString();

    const existingItems = (
      await this.findAnonymizationFields({
        page: 1,
        perPage: 1000,
        filter: items.map((updated) => `id:${updated.id}`).join(' OR '),
        fields: ['id'],
      })
    ).data.reduce((res, item) => {
      res[item.id] = item;
      return res;
    }, {} as Record<string, AnonymizationFieldResponse>);
    const formattedItems = items.map((item) => {
      return {
        attributes: {
          default_allow: item.defaultAllow ?? false,
          default_allow_replacement: item.defaultAllowReplacement ?? false,
          updated_by: user,
          updated_at: dateNow,
        },
        id: existingItems[item.id].id,
        type: assistantAnonymizationFieldsTypeName,
      };
    });
    const savedObjectsBulk =
      await savedObjectsClient.bulkUpdate<AssistantAnonymizationFieldSoSchema>(formattedItems);
    const result = savedObjectsBulk.saved_objects.map((savedObject) =>
      transformSavedObjectUpdateToAssistantAnonymizationField({ savedObject })
    );
    return result;
  };

  /**
   * Delete the anonymization field by id
   * @param options
   * @param options.id the "id" of the anonymization field
   */
  public deleteAnonymizationFieldsByIds = async (
    ids: string[]
  ): Promise<SavedObjectsBulkDeleteStatus[]> => {
    const { savedObjectsClient } = this;

    const res = await savedObjectsClient.bulkDelete(
      ids.map((id) => ({ id, type: assistantAnonymizationFieldsTypeName }))
    );
    return res.statuses;
  };

  /**
   * Finds anonymization fields given a set of criteria.
   * @param options
   * @param options.filter The filter to apply in the search
   * @param options.perPage How many per page to return
   * @param options.page The page number or "undefined" if there is no page number to continue from
   * @param options.pit The Point in Time (pit) id if there is one, otherwise "undefined" can be sent in
   * @param options.sortField The sort field string if there is one, otherwise "undefined" can be sent in
   * @param options.sortOrder The sort order of "asc" or "desc", otherwise "undefined" can be sent in
   * @returns The found anonymization fields or null if nothing is found
   */
  public findAnonymizationFields = async ({
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
  }): Promise<FindAnonymizationFieldsResponse> => {
    const { savedObjectsClient } = this;

    const savedObjectsFindResponse =
      await savedObjectsClient.find<AssistantAnonymizationFieldSoSchema>({
        filter,
        page,
        perPage,
        sortField,
        sortOrder,
        type: assistantAnonymizationFieldsTypeName,
        fields,
      });

    return transformSavedObjectsToFoundAssistantAnonymizationField({ savedObjectsFindResponse });
  };
}
