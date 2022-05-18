/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CreateExceptionListItemSchema,
  CreateExceptionListSchema,
  ExceptionListItemSchema,
  ExceptionListSummarySchema,
  FoundExceptionListItemSchema,
  ListId,
  UpdateExceptionListItemSchema,
} from '@kbn/securitysolution-io-ts-list-types';
import { EXCEPTION_LIST_ITEM_URL, EXCEPTION_LIST_URL } from '@kbn/securitysolution-list-constants';
import { HttpStart } from '@kbn/core/public';
import { MANAGEMENT_DEFAULT_PAGE, MANAGEMENT_DEFAULT_PAGE_SIZE } from '../../common/constants';

/**
 * A generic class to be used for each artifact type.
 * It follow the Singleton pattern.
 * Please, use the getInstance method instead of creating a new instance when using this implementation.
 */
export class ExceptionsListApiClient {
  private static instance: Map<ListId, ExceptionsListApiClient> = new Map();
  private static wasListCreated: Map<ListId, Promise<void>> = new Map();
  private ensureListExists: Promise<void>;

  constructor(
    private readonly http: HttpStart,
    public readonly listId: ListId,
    private readonly listDefinition: CreateExceptionListSchema,
    private readonly readTransform?: (item: ExceptionListItemSchema) => ExceptionListItemSchema,
    private readonly writeTransform?: <
      T extends CreateExceptionListItemSchema | UpdateExceptionListItemSchema
    >(
      item: T
    ) => T
  ) {
    this.ensureListExists = this.createExceptionList();
  }

  /**
   * PrivateStatic method that creates the list and don't throw if list already exists.
   * This method is being used when initializing an instance only once.
   */
  private async createExceptionList(): Promise<void> {
    if (ExceptionsListApiClient.wasListCreated.has(this.listId)) {
      return ExceptionsListApiClient.wasListCreated.get(this.listId);
    }
    ExceptionsListApiClient.wasListCreated.set(
      this.listId,
      new Promise<void>((resolve, reject) => {
        const asyncFunction = async () => {
          try {
            await this.http.post<ExceptionListItemSchema>(EXCEPTION_LIST_URL, {
              body: JSON.stringify({ ...this.listDefinition, list_id: this.listId }),
            });

            resolve();
          } catch (err) {
            // Ignore 409 errors. List already created
            if (err.response?.status !== 409) {
              ExceptionsListApiClient.wasListCreated.delete(this.listId);
              reject(err);
            }

            resolve();
          }
        };
        asyncFunction();
      })
    );

    return ExceptionsListApiClient.wasListCreated.get(this.listId);
  }

  /**
   * Private method that throws an error when some of the checks to ensure the instance
   * we are using is the right one fail
   */
  private checkIfIsUsingTheRightInstance(listId: ListId): void {
    if (listId !== this.listId) {
      throw new Error(
        `The list id you are using is not valid, expected [${this.listId}] list id but received [${listId}] list id`
      );
    }
  }

  public isHttp(coreHttp: HttpStart): boolean {
    return this.http === coreHttp;
  }

  /**
   * Static method to get a fresh or existing instance.
   * It will ensure we only check and create the list once.
   */
  public static getInstance(
    http: HttpStart,
    listId: string,
    listDefinition: CreateExceptionListSchema,
    readTransform?: (item: ExceptionListItemSchema) => ExceptionListItemSchema,
    writeTransform?: <T extends CreateExceptionListItemSchema | UpdateExceptionListItemSchema>(
      item: T
    ) => T
  ): ExceptionsListApiClient {
    if (
      !ExceptionsListApiClient.instance.has(listId) ||
      !ExceptionsListApiClient.instance.get(listId)?.isHttp(http)
    ) {
      ExceptionsListApiClient.instance.set(
        listId,
        new ExceptionsListApiClient(http, listId, listDefinition, readTransform, writeTransform)
      );
    }
    const currentInstance = ExceptionsListApiClient.instance.get(listId);
    if (currentInstance) {
      return currentInstance;
    } else {
      return new ExceptionsListApiClient(
        http,
        listId,
        listDefinition,
        readTransform,
        writeTransform
      );
    }
  }

  /**
   * Static method to clean an exception item before sending it to update.
   */
  public static cleanExceptionsBeforeUpdate(
    exception: UpdateExceptionListItemSchema
  ): UpdateExceptionListItemSchema {
    const exceptionToUpdateCleaned = { ...exception };
    // Clean unnecessary fields for update action
    [
      'created_at',
      'created_by',
      'list_id',
      'tie_breaker_id',
      'updated_at',
      'updated_by',
      'meta',
    ].forEach((field) => {
      delete exceptionToUpdateCleaned[field as keyof UpdateExceptionListItemSchema];
    });

    exceptionToUpdateCleaned.comments = exceptionToUpdateCleaned.comments?.map((comment) => ({
      comment: comment.comment,
      id: comment.id,
    }));

    return exceptionToUpdateCleaned as UpdateExceptionListItemSchema;
  }

  /**
   * Returns a list of items with pagination params.
   * It accepts the allowed filtering, sorting and pagination options as param.
   */
  async find({
    perPage = MANAGEMENT_DEFAULT_PAGE_SIZE,
    page = MANAGEMENT_DEFAULT_PAGE + 1,
    sortField,
    sortOrder,
    filter,
  }: Partial<{
    page: number;
    perPage: number;
    sortField: string;
    sortOrder: string;
    filter: string;
  }> = {}): Promise<FoundExceptionListItemSchema> {
    await this.ensureListExists;
    const result = await this.http.get<FoundExceptionListItemSchema>(
      `${EXCEPTION_LIST_ITEM_URL}/_find`,
      {
        query: {
          page,
          per_page: perPage,
          sort_field: sortField,
          sort_order: sortOrder,
          list_id: [this.listId],
          namespace_type: ['agnostic'],
          filter,
        },
      }
    );

    if (this.readTransform) {
      result.data = result.data.map(this.readTransform);
    }

    return result;
  }

  /**
   * Returns an item for the given `itemId` or `id`. Exception List Items have both an `item_id`
   * and `id`, and at least one of these two is required to be provided.
   */
  async get(itemId?: string, id?: string): Promise<ExceptionListItemSchema> {
    if (!itemId && !id) {
      throw TypeError('either `itemId` or `id` argument must be set');
    }

    await this.ensureListExists;
    let result = await this.http.get<ExceptionListItemSchema>(EXCEPTION_LIST_ITEM_URL, {
      query: {
        id,
        item_id: itemId,
        namespace_type: 'agnostic',
      },
    });

    if (this.readTransform) {
      result = this.readTransform(result);
    }

    return result;
  }

  /**
   * It creates an item and returns the created one.
   * It requires a CreateExceptionListItemSchema object.
   */
  async create(exception: CreateExceptionListItemSchema): Promise<ExceptionListItemSchema> {
    await this.ensureListExists;
    this.checkIfIsUsingTheRightInstance(exception.list_id);
    delete exception.meta;

    let transformedException = exception;
    if (this.writeTransform) {
      transformedException = this.writeTransform(exception);
    }

    return this.http.post<ExceptionListItemSchema>(EXCEPTION_LIST_ITEM_URL, {
      body: JSON.stringify(transformedException),
    });
  }

  /**
   * It updates an existing item and returns the updated one.
   * It requires a UpdateExceptionListItemSchema object.
   */
  async update(exception: UpdateExceptionListItemSchema): Promise<ExceptionListItemSchema> {
    await this.ensureListExists;

    let transformedException = exception;
    if (this.writeTransform) {
      transformedException = this.writeTransform(exception);
    }

    return this.http.put<ExceptionListItemSchema>(EXCEPTION_LIST_ITEM_URL, {
      body: JSON.stringify(
        ExceptionsListApiClient.cleanExceptionsBeforeUpdate(transformedException)
      ),
    });
  }

  /**
   * It deletes an existing item by `itemId` or `id`. Exception List Items have both an `item_id`
   * and `id`, and at least one of these two is required to be provided.
   */
  async delete(itemId?: string, id?: string): Promise<ExceptionListItemSchema> {
    if (!itemId && !id) {
      throw TypeError('either `itemId` or `id` argument must be set');
    }

    await this.ensureListExists;
    return this.http.delete<ExceptionListItemSchema>(EXCEPTION_LIST_ITEM_URL, {
      query: {
        id,
        item_id: itemId,
        namespace_type: 'agnostic',
      },
    });
  }

  /**
   * It returns a summary of the current list_id
   * It accepts a filter param to filter the summary results using KQL filtering.
   */
  async summary(filter?: string): Promise<ExceptionListSummarySchema> {
    await this.ensureListExists;
    return this.http.get<ExceptionListSummarySchema>(`${EXCEPTION_LIST_URL}/summary`, {
      query: {
        filter,
        list_id: this.listId,
        namespace_type: 'agnostic',
      },
    });
  }

  /**
   * Checks if the given list has any data in it
   */
  async hasData(): Promise<boolean> {
    return (await this.find({ perPage: 1, page: 1 })).total > 0;
  }
}
