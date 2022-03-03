/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  KibanaRequest,
  SavedObjectsClientContract,
  SavedObjectsClosePointInTimeResponse,
  SavedObjectsOpenPointInTimeResponse,
} from 'kibana/server';
import {
  ExceptionListItemSchema,
  ExceptionListSchema,
  ExceptionListSummarySchema,
  FoundExceptionListItemSchema,
  FoundExceptionListSchema,
  ImportExceptionsResponseSchema,
  createExceptionListItemSchema,
  updateExceptionListItemSchema,
} from '@kbn/securitysolution-io-ts-list-types';
import { ENDPOINT_LIST_ID } from '@kbn/securitysolution-list-constants';
import { createPromiseFromStreams } from '@kbn/utils';

import type {
  ExtensionPointStorageClientInterface,
  ServerExtensionCallbackContext,
} from '../extension_points';

import type {
  ClosePointInTimeOptions,
  ConstructorOptions,
  CreateEndpointListItemOptions,
  CreateExceptionListItemOptions,
  CreateExceptionListOptions,
  DeleteEndpointListItemOptions,
  DeleteExceptionListItemByIdOptions,
  DeleteExceptionListItemOptions,
  DeleteExceptionListOptions,
  ExportExceptionListAndItemsOptions,
  FindEndpointListItemOptions,
  FindExceptionListItemOptions,
  FindExceptionListItemPointInTimeFinderOptions,
  FindExceptionListItemsPointInTimeFinderOptions,
  FindExceptionListOptions,
  FindExceptionListPointInTimeFinderOptions,
  FindExceptionListsItemOptions,
  FindValueListExceptionListsItems,
  FindValueListExceptionListsItemsPointInTimeFinder,
  GetEndpointListItemOptions,
  GetExceptionListItemOptions,
  GetExceptionListOptions,
  GetExceptionListSummaryOptions,
  ImportExceptionListAndItemsAsArrayOptions,
  ImportExceptionListAndItemsOptions,
  OpenPointInTimeOptions,
  UpdateEndpointListItemOptions,
  UpdateExceptionListItemOptions,
  UpdateExceptionListOptions,
} from './exception_list_client_types';
import { getExceptionList } from './get_exception_list';
import {
  ExportExceptionListAndItemsReturn,
  exportExceptionListAndItems,
} from './export_exception_list_and_items';
import { getExceptionListSummary } from './get_exception_list_summary';
import { createExceptionList } from './create_exception_list';
import { getExceptionListItem } from './get_exception_list_item';
import { createExceptionListItem } from './create_exception_list_item';
import { updateExceptionList } from './update_exception_list';
import { updateExceptionListItem } from './update_exception_list_item';
import { deleteExceptionList } from './delete_exception_list';
import { deleteExceptionListItem, deleteExceptionListItemById } from './delete_exception_list_item';
import { findExceptionListItem } from './find_exception_list_item';
import { findExceptionList } from './find_exception_list';
import { findExceptionListsItem } from './find_exception_list_items';
import { createEndpointList } from './create_endpoint_list';
import { createEndpointTrustedAppsList } from './create_endpoint_trusted_apps_list';
import { PromiseFromStreams, importExceptions } from './import_exception_list_and_items';
import {
  transformCreateExceptionListItemOptionsToCreateExceptionListItemSchema,
  transformUpdateExceptionListItemOptionsToUpdateExceptionListItemSchema,
  validateData,
} from './utils';
import {
  createExceptionsStreamFromNdjson,
  exceptionsChecksFromArray,
} from './utils/import/create_exceptions_stream_logic';
import { openPointInTime } from './open_point_in_time';
import { closePointInTime } from './close_point_in_time';
import { findExceptionListPointInTimeFinder } from './find_exception_list_point_in_time_finder';
import { findValueListExceptionListItems } from './find_value_list_exception_list_items';
import { findExceptionListsItemPointInTimeFinder } from './find_exception_list_items_point_in_time_finder';
import { findValueListExceptionListItemsPointInTimeFinder } from './find_value_list_exception_list_items_point_in_time_finder';
import { findExceptionListItemPointInTimeFinder } from './find_exception_list_item_point_in_time_finder';

export class ExceptionListClient {
  private readonly user: string;
  private readonly savedObjectsClient: SavedObjectsClientContract;
  private readonly serverExtensionsClient: ExtensionPointStorageClientInterface;
  private readonly enableServerExtensionPoints: boolean;
  private readonly request?: KibanaRequest;

  constructor({
    user,
    savedObjectsClient,
    serverExtensionsClient,
    enableServerExtensionPoints = true,
    request,
  }: ConstructorOptions) {
    this.user = user;
    this.savedObjectsClient = savedObjectsClient;
    this.serverExtensionsClient = serverExtensionsClient;
    this.enableServerExtensionPoints = enableServerExtensionPoints;
    this.request = request;
  }

  private getServerExtensionCallbackContext(): ServerExtensionCallbackContext {
    const { user, serverExtensionsClient, savedObjectsClient, request } = this;
    let exceptionListClient: undefined | ExceptionListClient;

    return {
      // Lazy getter so that we only initialize a new instance of the class if needed
      get exceptionListClient(): ExceptionListClient {
        if (!exceptionListClient) {
          exceptionListClient = new ExceptionListClient({
            enableServerExtensionPoints: false,
            request,
            savedObjectsClient,
            serverExtensionsClient,
            user,
          });
        }

        return exceptionListClient;
      },
      request: this.request,
    };
  }

  /**
   * Fetch an exception list parent container
   * @params listId {string | undefined} the "list_id" of an exception list
   * @params id {string | undefined} the "id" of an exception list
   * @params namespaceType {string | undefined} saved object namespace (single | agnostic)
   * @return {ExceptionListSchema | null} the found exception list or null if none exists
   */
  public getExceptionList = async ({
    listId,
    id,
    namespaceType,
  }: GetExceptionListOptions): Promise<ExceptionListSchema | null> => {
    const { savedObjectsClient } = this;
    return getExceptionList({ id, listId, namespaceType, savedObjectsClient });
  };

  /**
   * Fetch an exception list parent container
   * @params filter {sting | undefined} kql "filter" expression
   * @params listId {string | undefined} the "list_id" of an exception list
   * @params id {string | undefined} the "id" of an exception list
   * @params namespaceType {string | undefined} saved object namespace (single | agnostic)
   * @return {ExceptionListSummarySchema | null} summary of exception list item os types
   */
  public getExceptionListSummary = async ({
    filter,
    listId,
    id,
    namespaceType,
  }: GetExceptionListSummaryOptions): Promise<ExceptionListSummarySchema | null> => {
    const { savedObjectsClient } = this;

    if (this.enableServerExtensionPoints) {
      await this.serverExtensionsClient.pipeRun(
        'exceptionsListPreSummary',
        {
          filter,
          id,
          listId,
          namespaceType,
        },
        this.getServerExtensionCallbackContext()
      );
    }

    return getExceptionListSummary({ filter, id, listId, namespaceType, savedObjectsClient });
  };

  /**
   * Fetch an exception list item container
   * @params listId {string | undefined} the "list_id" of an exception list
   * @params id {string | undefined} the "id" of an exception list
   * @params namespaceType {string | undefined} saved object namespace (single | agnostic)
   * @return {ExceptionListSummarySchema | null} the found exception list item or null if none exists
   */
  public getExceptionListItem = async ({
    itemId,
    id,
    namespaceType,
  }: GetExceptionListItemOptions): Promise<ExceptionListItemSchema | null> => {
    const { savedObjectsClient } = this;

    if (this.enableServerExtensionPoints) {
      await this.serverExtensionsClient.pipeRun(
        'exceptionsListPreGetOneItem',
        { id, itemId, namespaceType },
        this.getServerExtensionCallbackContext()
      );
    }

    return getExceptionListItem({ id, itemId, namespaceType, savedObjectsClient });
  };

  /**
   * This creates an agnostic space endpoint list if it does not exist. This tries to be
   * as fast as possible by ignoring conflict errors and not returning the contents of the
   * list if it already exists.
   * @returns ExceptionListSchema if it created the endpoint list, otherwise null if it already exists
   */
  public createEndpointList = async (): Promise<ExceptionListSchema | null> => {
    const { savedObjectsClient, user } = this;
    return createEndpointList({
      savedObjectsClient,
      user,
      version: 1,
    });
  };

  /**
   * Create the Trusted Apps Agnostic list if it does not yet exist (`null` is returned if it does exist)
   */
  public createTrustedAppsList = async (): Promise<ExceptionListSchema | null> => {
    const { savedObjectsClient, user } = this;
    return createEndpointTrustedAppsList({
      savedObjectsClient,
      user,
      version: 1,
    });
  };

  /**
   * This is the same as "createListItem" except it applies specifically to the agnostic endpoint list and will
   * auto-call the "createEndpointList" for you so that you have the best chance of the agnostic endpoint
   * being there and existing before the item is inserted into the agnostic endpoint list.
   */
  public createEndpointListItem = async ({
    comments,
    description,
    entries,
    itemId,
    meta,
    name,
    osTypes,
    tags,
    type,
  }: CreateEndpointListItemOptions): Promise<ExceptionListItemSchema> => {
    const { savedObjectsClient, user } = this;
    await this.createEndpointList();
    return createExceptionListItem({
      comments,
      description,
      entries,
      itemId,
      listId: ENDPOINT_LIST_ID,
      meta,
      name,
      namespaceType: 'agnostic',
      osTypes,
      savedObjectsClient,
      tags,
      type,
      user,
    });
  };

  /**
   * This is the same as "updateExceptionListItem" except it applies specifically to the endpoint list and will
   * auto-call the "createEndpointList" for you so that you have the best chance of the endpoint
   * being there if it did not exist before. If the list did not exist before, then creating it here will still cause a
   * return of null but at least the list exists again.
   */
  public updateEndpointListItem = async ({
    _version,
    comments,
    description,
    entries,
    id,
    itemId,
    meta,
    name,
    osTypes,
    tags,
    type,
  }: UpdateEndpointListItemOptions): Promise<ExceptionListItemSchema | null> => {
    const { savedObjectsClient, user } = this;
    await this.createEndpointList();
    return updateExceptionListItem({
      _version,
      comments,
      description,
      entries,
      id,
      itemId,
      meta,
      name,
      namespaceType: 'agnostic',
      osTypes,
      savedObjectsClient,
      tags,
      type,
      user,
    });
  };

  /**
   * This is the same as "getExceptionListItem" except it applies specifically to the endpoint list.
   */
  public getEndpointListItem = async ({
    itemId,
    id,
  }: GetEndpointListItemOptions): Promise<ExceptionListItemSchema | null> => {
    const { savedObjectsClient } = this;
    return getExceptionListItem({ id, itemId, namespaceType: 'agnostic', savedObjectsClient });
  };

  /**
   * Create an exception list container
   * @params description {string} a description of the exception list
   * @params immutable {boolean} a description of the exception list
   * @params listId {string} the "list_id" of the exception list
   * @params meta {object | undefined}
   * @params name {string} the "name" of the exception list
   * @params namespaceType {string} saved object namespace (single | agnostic)
   * @params tags {array} user assigned tags of exception list
   * @params type {string} container type
   * @params version {number} document version
   * @return {ExceptionListSchema} the created exception list parent container
   */
  public createExceptionList = async ({
    description,
    immutable,
    listId,
    meta,
    name,
    namespaceType,
    tags,
    type,
    version,
  }: CreateExceptionListOptions): Promise<ExceptionListSchema> => {
    const { savedObjectsClient, user } = this;
    return createExceptionList({
      description,
      immutable,
      listId,
      meta,
      name,
      namespaceType,
      savedObjectsClient,
      tags,
      type,
      user,
      version,
    });
  };

  /**
   * Update an existing exception list container
   * @params _version {string | undefined} document version
   * @params id {string | undefined} the "id" of the exception list
   * @params description {string | undefined} a description of the exception list
   * @params listId {string | undefined} the "list_id" of the exception list
   * @params meta {object | undefined}
   * @params name {string | undefined} the "name" of the exception list
   * @params namespaceType {string} saved object namespace (single | agnostic)
   * @params tags {array | undefined} user assigned tags of exception list
   * @params type {string | undefined} container type
   * @params version {number | undefined} document version
   * @return {ExceptionListSchema | null} the updated exception list parent container
   */
  public updateExceptionList = async ({
    _version,
    id,
    description,
    listId,
    meta,
    name,
    namespaceType,
    tags,
    type,
    version,
  }: UpdateExceptionListOptions): Promise<ExceptionListSchema | null> => {
    const { savedObjectsClient, user } = this;
    return updateExceptionList({
      _version,
      description,
      id,
      listId,
      meta,
      name,
      namespaceType,
      savedObjectsClient,
      tags,
      type,
      user,
      version,
    });
  };

  /**
   * Delete an exception list container by either id or list_id
   * @params listId {string | undefined} the "list_id" of an exception list
   * @params id {string | undefined} the "id" of an exception list
   * @params namespaceType {string} saved object namespace (single | agnostic)
   * @return {ExceptionListSchema | null} the deleted exception list or null if none exists
   */
  public deleteExceptionList = async ({
    id,
    listId,
    namespaceType,
  }: DeleteExceptionListOptions): Promise<ExceptionListSchema | null> => {
    const { savedObjectsClient } = this;
    return deleteExceptionList({
      id,
      listId,
      namespaceType,
      savedObjectsClient,
    });
  };

  /**
   * Create an exception list item container
   * @params description {string} a description of the exception list
   * @params entries {array} an array with the exception list item entries
   * @params itemId {string} the "item_id" of the exception list item
   * @params listId {string} the "list_id" of the parent exception list
   * @params meta {object | undefined}
   * @params name {string} the "name" of the exception list
   * @params namespaceType {string} saved object namespace (single | agnostic)
   * @params osTypes {array} item os types to apply
   * @params tags {array} user assigned tags of exception list
   * @params type {string} container type
   * @return {ExceptionListItemSchema} the created exception list item container
   */
  public createExceptionListItem = async ({
    comments,
    description,
    entries,
    itemId,
    listId,
    meta,
    name,
    namespaceType,
    osTypes,
    tags,
    type,
  }: CreateExceptionListItemOptions): Promise<ExceptionListItemSchema> => {
    const { savedObjectsClient, user } = this;
    let itemData: CreateExceptionListItemOptions = {
      comments,
      description,
      entries,
      itemId,
      listId,
      meta,
      name,
      namespaceType,
      osTypes,
      tags,
      type,
    };

    if (this.enableServerExtensionPoints) {
      itemData = await this.serverExtensionsClient.pipeRun(
        'exceptionsListPreCreateItem',
        itemData,
        this.getServerExtensionCallbackContext(),
        (data) => {
          return validateData(
            createExceptionListItemSchema,
            transformCreateExceptionListItemOptionsToCreateExceptionListItemSchema(data)
          );
        }
      );
    }

    return createExceptionListItem({
      ...itemData,
      savedObjectsClient,
      user,
    });
  };

  /**
   * Update an existing exception list item
   * @params _version {string | undefined} document version
   * @params comments {array} user comments attached to item
   * @params entries {array} item exception entries logic
   * @params id {string | undefined} the "id" of the exception list item
   * @params description {string | undefined} a description of the exception list
   * @params itemId {string | undefined} the "item_id" of the exception list item
   * @params meta {object | undefined}
   * @params name {string | undefined} the "name" of the exception list
   * @params namespaceType {string} saved object namespace (single | agnostic)
   * @params osTypes {array} item os types to apply
   * @params tags {array | undefined} user assigned tags of exception list
   * @params type {string | undefined} container type
   * @return {ExceptionListItemSchema | null} the updated exception list item or null if none exists
   */
  public updateExceptionListItem = async ({
    _version,
    comments,
    description,
    entries,
    id,
    itemId,
    meta,
    name,
    namespaceType,
    osTypes,
    tags,
    type,
  }: UpdateExceptionListItemOptions): Promise<ExceptionListItemSchema | null> => {
    const { savedObjectsClient, user } = this;
    let updatedItem: UpdateExceptionListItemOptions = {
      _version,
      comments,
      description,
      entries,
      id,
      itemId,
      meta,
      name,
      namespaceType,
      osTypes,
      tags,
      type,
    };

    if (this.enableServerExtensionPoints) {
      updatedItem = await this.serverExtensionsClient.pipeRun(
        'exceptionsListPreUpdateItem',
        updatedItem,
        this.getServerExtensionCallbackContext(),
        (data) => {
          return validateData(
            updateExceptionListItemSchema,
            transformUpdateExceptionListItemOptionsToUpdateExceptionListItemSchema(data)
          );
        }
      );
    }

    return updateExceptionListItem({
      ...updatedItem,
      savedObjectsClient,
      user,
    });
  };

  /**
   * Delete an exception list item by either id or item_id
   * @params itemId {string | undefined} the "item_id" of an exception list item
   * @params id {string | undefined} the "id" of an exception list item
   * @params namespaceType {string} saved object namespace (single | agnostic)
   * @return {ExceptionListItemSchema | null} the deleted exception list item or null if none exists
   */
  public deleteExceptionListItem = async ({
    id,
    itemId,
    namespaceType,
  }: DeleteExceptionListItemOptions): Promise<ExceptionListItemSchema | null> => {
    const { savedObjectsClient } = this;

    if (this.enableServerExtensionPoints) {
      await this.serverExtensionsClient.pipeRun(
        'exceptionsListPreDeleteItem',
        { id, itemId, namespaceType },
        this.getServerExtensionCallbackContext()
      );
    }

    return deleteExceptionListItem({
      id,
      itemId,
      namespaceType,
      savedObjectsClient,
    });
  };

  /**
   * Delete an exception list item by id
   * @params id {string | undefined} the "id" of an exception list item
   * @params namespaceType {string} saved object namespace (single | agnostic)
   * @return {void}
   */
  public deleteExceptionListItemById = async ({
    id,
    namespaceType,
  }: DeleteExceptionListItemByIdOptions): Promise<void> => {
    const { savedObjectsClient } = this;

    if (this.enableServerExtensionPoints) {
      await this.serverExtensionsClient.pipeRun(
        'exceptionsListPreDeleteItem',
        { id, itemId: undefined, namespaceType },
        this.getServerExtensionCallbackContext()
      );
    }

    return deleteExceptionListItemById({
      id,
      namespaceType,
      savedObjectsClient,
    });
  };

  /**
   * This is the same as "deleteExceptionListItem" except it applies specifically to the endpoint list.
   */
  public deleteEndpointListItem = async ({
    id,
    itemId,
  }: DeleteEndpointListItemOptions): Promise<ExceptionListItemSchema | null> => {
    const { savedObjectsClient } = this;
    return deleteExceptionListItem({
      id,
      itemId,
      namespaceType: 'agnostic',
      savedObjectsClient,
    });
  };

  public findExceptionListItem = async ({
    listId,
    filter,
    perPage,
    pit,
    page,
    searchAfter,
    sortField,
    sortOrder,
    namespaceType,
  }: FindExceptionListItemOptions): Promise<FoundExceptionListItemSchema | null> => {
    const { savedObjectsClient } = this;

    if (this.enableServerExtensionPoints) {
      await this.serverExtensionsClient.pipeRun(
        'exceptionsListPreSingleListFind',
        {
          filter,
          listId,
          namespaceType,
          page,
          perPage,
          pit,
          searchAfter,
          sortField,
          sortOrder,
        },
        this.getServerExtensionCallbackContext()
      );
    }

    return findExceptionListItem({
      filter,
      listId,
      namespaceType,
      page,
      perPage,
      pit,
      savedObjectsClient,
      searchAfter,
      sortField,
      sortOrder,
    });
  };

  public findExceptionListsItem = async ({
    listId,
    filter,
    perPage,
    pit,
    page,
    searchAfter,
    sortField,
    sortOrder,
    namespaceType,
  }: FindExceptionListsItemOptions): Promise<FoundExceptionListItemSchema | null> => {
    const { savedObjectsClient } = this;

    if (this.enableServerExtensionPoints) {
      await this.serverExtensionsClient.pipeRun(
        'exceptionsListPreMultiListFind',
        {
          filter,
          listId,
          namespaceType,
          page,
          perPage,
          pit,
          searchAfter,
          sortField,
          sortOrder,
        },
        this.getServerExtensionCallbackContext()
      );
    }

    return findExceptionListsItem({
      filter,
      listId,
      namespaceType,
      page,
      perPage,
      pit,
      savedObjectsClient,
      searchAfter,
      sortField,
      sortOrder,
    });
  };

  public findValueListExceptionListItems = async ({
    perPage,
    pit,
    page,
    searchAfter,
    sortField,
    sortOrder,
    valueListId,
  }: FindValueListExceptionListsItems): Promise<FoundExceptionListItemSchema | null> => {
    const { savedObjectsClient } = this;
    return findValueListExceptionListItems({
      page,
      perPage,
      pit,
      savedObjectsClient,
      searchAfter,
      sortField,
      sortOrder,
      valueListId,
    });
  };

  public findExceptionList = async ({
    filter,
    perPage,
    page,
    pit,
    searchAfter,
    sortField,
    sortOrder,
    namespaceType,
  }: FindExceptionListOptions): Promise<FoundExceptionListSchema> => {
    const { savedObjectsClient } = this;
    return findExceptionList({
      filter,
      namespaceType,
      page,
      perPage,
      pit,
      savedObjectsClient,
      searchAfter,
      sortField,
      sortOrder,
    });
  };

  /**
   * This is the same as "findExceptionList" except it applies specifically to the  endpoint list and will
   * auto-call the "createEndpointList" for you so that you have the best chance of the  endpoint
   * being there if it did not exist before. If the list did not exist before, then creating it here should give you
   * a good guarantee that you will get an empty record set rather than null. I keep the null as the return value in
   * the off chance that you still might somehow not get into a race condition where the  endpoint list does
   * not exist because someone deleted it in-between the initial create and then the find.
   */
  public findEndpointListItem = async ({
    filter,
    perPage,
    page,
    pit,
    searchAfter,
    sortField,
    sortOrder,
  }: FindEndpointListItemOptions): Promise<FoundExceptionListItemSchema | null> => {
    const { savedObjectsClient } = this;
    await this.createEndpointList();
    return findExceptionListItem({
      filter,
      listId: ENDPOINT_LIST_ID,
      namespaceType: 'agnostic',
      page,
      perPage,
      pit,
      savedObjectsClient,
      searchAfter,
      sortField,
      sortOrder,
    });
  };

  /**
   * Export an exception list parent container and it's items
   * @params listId {string | undefined} the "list_id" of an exception list
   * @params id {string | undefined} the "id" of an exception list
   * @params namespaceType {string | undefined} saved object namespace (single | agnostic)
   * @return {ExportExceptionListAndItemsReturn | null} the ndjson of the list and items to export or null if none exists
   */
  public exportExceptionListAndItems = async ({
    listId,
    id,
    namespaceType,
  }: ExportExceptionListAndItemsOptions): Promise<ExportExceptionListAndItemsReturn | null> => {
    const { savedObjectsClient } = this;

    if (this.enableServerExtensionPoints) {
      await this.serverExtensionsClient.pipeRun(
        'exceptionsListPreExport',
        {
          id,
          listId,
          namespaceType,
        },
        this.getServerExtensionCallbackContext()
      );
    }

    return exportExceptionListAndItems({
      id,
      listId,
      namespaceType,
      savedObjectsClient,
    });
  };

  /**
   * Import exception lists parent containers and items as stream
   * @params exceptionsToImport {stream} ndjson stream of lists and items
   * @params maxExceptionsImportSize {number} the max number of lists and items to import, defaults to 10,000
   * @params overwrite {boolean} whether or not to overwrite an exception list with imported list if a matching list_id found
   * @return {ImportExceptionsResponseSchema} summary of imported count and errors
   */
  public importExceptionListAndItems = async ({
    exceptionsToImport,
    maxExceptionsImportSize,
    overwrite,
  }: ImportExceptionListAndItemsOptions): Promise<ImportExceptionsResponseSchema> => {
    const { savedObjectsClient, user } = this;

    // validation of import and sorting of lists and items
    const readStream = createExceptionsStreamFromNdjson(maxExceptionsImportSize);
    const [parsedObjects] = await createPromiseFromStreams<PromiseFromStreams[]>([
      exceptionsToImport,
      ...readStream,
    ]);

    if (this.enableServerExtensionPoints) {
      await this.serverExtensionsClient.pipeRun(
        'exceptionsListPreImport',
        parsedObjects,
        this.getServerExtensionCallbackContext()
      );
    }

    return importExceptions({
      exceptions: parsedObjects,
      overwrite,
      savedObjectsClient,
      user,
    });
  };

  /**
   * Import exception lists parent containers and items as array
   * @params exceptionsToImport {array} array of lists and items
   * @params maxExceptionsImportSize {number} the max number of lists and items to import, defaults to 10,000
   * @params overwrite {boolean} whether or not to overwrite an exception list with imported list if a matching list_id found
   * @return {ImportExceptionsResponseSchema} summary of imported count and errors
   */
  public importExceptionListAndItemsAsArray = async ({
    exceptionsToImport,
    maxExceptionsImportSize,
    overwrite,
  }: ImportExceptionListAndItemsAsArrayOptions): Promise<ImportExceptionsResponseSchema> => {
    const { savedObjectsClient, user } = this;

    // validation of import and sorting of lists and items
    const parsedObjects = exceptionsChecksFromArray(exceptionsToImport, maxExceptionsImportSize);

    if (this.enableServerExtensionPoints) {
      await this.serverExtensionsClient.pipeRun(
        'exceptionsListPreImport',
        parsedObjects,
        this.getServerExtensionCallbackContext()
      );
    }

    return importExceptions({
      exceptions: parsedObjects,
      overwrite,
      savedObjectsClient,
      user,
    });
  };

  /**
   * Opens a point in time (PIT) for either exception lists or exception list items.
   * See: https://www.elastic.co/guide/en/elasticsearch/reference/current/point-in-time-api.html
   * @params namespaceType {string} "agnostic" or "single" depending on which namespace you are targeting
   * @params options {Object} The saved object PIT options
   * @return {SavedObjectsOpenPointInTimeResponse} The point in time (PIT)
   */
  public openPointInTime = async ({
    namespaceType,
    options,
  }: OpenPointInTimeOptions): Promise<SavedObjectsOpenPointInTimeResponse> => {
    const { savedObjectsClient } = this;
    return openPointInTime({
      namespaceType,
      options,
      savedObjectsClient,
    });
  };

  /**
   * Closes a point in time (PIT) for either exception lists or exception list items.
   * See: https://www.elastic.co/guide/en/elasticsearch/reference/current/point-in-time-api.html
   * @params pit {string} The point in time to close
   * @return {SavedObjectsOpenPointInTimeResponse} The point in time (PIT)
   */
  public closePointInTime = async ({
    pit,
  }: ClosePointInTimeOptions): Promise<SavedObjectsClosePointInTimeResponse> => {
    const { savedObjectsClient } = this;
    return closePointInTime({
      pit,
      savedObjectsClient,
    });
  };

  /**
   * Finds an exception list item within a point in time (PIT) and then calls the function
   * `executeFunctionOnStream` until the maxPerPage is reached and stops.
   * NOTE: This is slightly different from the saved objects version in that it takes
   * an injected function, so that we avoid doing additional plumbing with generators
   * to try to keep the maintenance of this machinery simpler for now.
   *
   * If you want to stream all results up to 10k into memory for correlation this would be:
   * @example
   * ```ts
   * const exceptionList: ExceptionListItemSchema[] = [];
   * const executeFunctionOnStream = (response: FoundExceptionListItemSchema) => {
   *   exceptionList = [...exceptionList, ...response.data];
   * }
   * await client.findExceptionListItemPointInTimeFinder({
   *   filter,
   *   executeFunctionOnStream,
   *   namespaceType,
   *   maxSize: 10_000, // NOTE: This is unbounded if it is "undefined"
   *   perPage: 1_000, // See https://github.com/elastic/kibana/issues/93770 for choice of 1k
   *   sortField,
   *   sortOrder,
   *   exe
   * });
   * ```
   * @param filter {string} Your filter
   * @param namespaceType {string} "agnostic" | "single" of your namespace
   * @param perPage {number} The number of items per page. Typical value should be 1_000 here. Never go above 10_000
   * @param maxSize {number of undefined} If given a max size, this will not exceeded. Otherwise if undefined is passed down, all records will be processed.
   * @param sortField {string} String of the field to sort against
   * @param sortOrder "asc" | "desc" The order to sort against
   */
  public findExceptionListItemPointInTimeFinder = async ({
    executeFunctionOnStream,
    filter,
    listId,
    maxSize,
    namespaceType,
    perPage,
    sortField,
    sortOrder,
  }: FindExceptionListItemPointInTimeFinderOptions): Promise<void> => {
    const { savedObjectsClient } = this;
    return findExceptionListItemPointInTimeFinder({
      executeFunctionOnStream,
      filter,
      listId,
      maxSize,
      namespaceType,
      perPage,
      savedObjectsClient,
      sortField,
      sortOrder,
    });
  };

  /**
   * Finds an exception list within a point in time (PIT) and then calls the function
   * `executeFunctionOnStream` until the maxPerPage is reached and stops.
   * NOTE: This is slightly different from the saved objects version in that it takes
   * an injected function, so that we avoid doing additional plumbing with generators
   * to try to keep the maintenance of this machinery simpler for now.
   *
   * If you want to stream all results up to 10k into memory for correlation this would be:
   * @example
   * ```ts
   * const exceptionList: ExceptionListSchema[] = [];
   * const executeFunctionOnStream = (response: FoundExceptionListSchema) => {
   *   exceptionList = [...exceptionList, ...response.data];
   * }
   * await client.findExceptionListPointInTimeFinder({
   *   filter,
   *   executeFunctionOnStream,
   *   namespaceType,
   *   maxSize: 10_000, // NOTE: This is unbounded if it is "undefined"
   *   perPage: 1_000, // See https://github.com/elastic/kibana/issues/93770 for choice of 1k
   *   sortField,
   *   sortOrder,
   *   exe
   * });
   * ```
   * @param filter {string} Your filter
   * @param namespaceType {string} "agnostic" | "single" of your namespace
   * @param perPage {number} The number of items per page. Typical value should be 1_000 here. Never go above 10_000
   * @param maxSize {number of undefined} If given a max size, this will not exceeded. Otherwise if undefined is passed down, all records will be processed.
   * @param sortField {string} String of the field to sort against
   * @param sortOrder "asc" | "desc" The order to sort against
   */
  public findExceptionListPointInTimeFinder = async ({
    executeFunctionOnStream,
    filter,
    maxSize,
    namespaceType,
    perPage,
    sortField,
    sortOrder,
  }: FindExceptionListPointInTimeFinderOptions): Promise<void> => {
    const { savedObjectsClient } = this;
    return findExceptionListPointInTimeFinder({
      executeFunctionOnStream,
      filter,
      maxSize,
      namespaceType,
      perPage,
      savedObjectsClient,
      sortField,
      sortOrder,
    });
  };

  /**
   * Finds exception list items within a point in time (PIT) and then calls the function
   * `executeFunctionOnStream` until the maxPerPage is reached and stops.
   * NOTE: This is slightly different from the saved objects version in that it takes
   * an injected function, so that we avoid doing additional plumbing with generators
   * to try to keep the maintenance of this machinery simpler for now.
   *
   * If you want to stream all results up to 10k into memory for correlation this would be:
   * @example
   * ```ts
   * const exceptionList: ExceptionListItemSchema[] = [];
   * const executeFunctionOnStream = (response: FoundExceptionListItemSchema) => {
   *   exceptionList = [...exceptionList, ...response.data];
   * }
   * await client.findExceptionListsItemPointInTimeFinder({
   *   filter,
   *   executeFunctionOnStream,
   *   namespaceType,
   *   maxSize: 10_000, // NOTE: This is unbounded if it is "undefined"
   *   perPage: 1_000, // See https://github.com/elastic/kibana/issues/93770 for choice of 1k
   *   sortField,
   *   sortOrder,
   *   exe
   * });
   * ```
   * @param filter {string} Your filter
   * @param namespaceType {string} "agnostic" | "single" of your namespace
   * @param perPage {number} The number of items per page. Typical value should be 1_000 here. Never go above 10_000
   * @param maxSize {number of undefined} If given a max size, this will not exceeded. Otherwise if undefined is passed down, all records will be processed.
   * @param sortField {string} String of the field to sort against
   * @param sortOrder "asc" | "desc" The order to sort against
   */
  public findExceptionListsItemPointInTimeFinder = async ({
    listId,
    namespaceType,
    executeFunctionOnStream,
    maxSize,
    filter,
    perPage,
    sortField,
    sortOrder,
  }: FindExceptionListItemsPointInTimeFinderOptions): Promise<void> => {
    const { savedObjectsClient } = this;
    return findExceptionListsItemPointInTimeFinder({
      executeFunctionOnStream,
      filter,
      listId,
      maxSize,
      namespaceType,
      perPage,
      savedObjectsClient,
      sortField,
      sortOrder,
    });
  };

  /**
   * Finds value lists within exception lists within a point in time (PIT) and then calls the function
   * `executeFunctionOnStream` until the maxPerPage is reached and stops.
   * NOTE: This is slightly different from the saved objects version in that it takes
   * an injected function, so that we avoid doing additional plumbing with generators
   * to try to keep the maintenance of this machinery simpler for now.
   *
   * If you want to stream all results up to 10k into memory for correlation this would be:
   * @example
   * ```ts
   * const exceptionList: ExceptionListItemSchema[] = [];
   * const executeFunctionOnStream = (response: FoundExceptionListItemSchema) => {
   *   exceptionList = [...exceptionList, ...response.data];
   * }
   * await client.findValueListExceptionListItemsPointInTimeFinder({
   *   valueListId,
   *   executeFunctionOnStream,
   *   namespaceType,
   *   maxSize: 10_000, // NOTE: This is unbounded if it is "undefined"
   *   perPage: 1_000, // See https://github.com/elastic/kibana/issues/93770 for choice of 1k
   *   sortField,
   *   sortOrder,
   *   exe
   * });
   * ```
   * @param valueListId {string} Your value list id
   * @param namespaceType {string} "agnostic" | "single" of your namespace
   * @param perPage {number} The number of items per page. Typical value should be 1_000 here. Never go above 10_000
   * @param maxSize {number of undefined} If given a max size, this will not exceeded. Otherwise if undefined is passed down, all records will be processed.
   * @param sortField {string} String of the field to sort against
   * @param sortOrder "asc" | "desc" The order to sort against
   */
  public findValueListExceptionListItemsPointInTimeFinder = async ({
    valueListId,
    executeFunctionOnStream,
    perPage,
    maxSize,
    sortField,
    sortOrder,
  }: FindValueListExceptionListsItemsPointInTimeFinder): Promise<void> => {
    const { savedObjectsClient } = this;
    return findValueListExceptionListItemsPointInTimeFinder({
      executeFunctionOnStream,
      maxSize,
      perPage,
      savedObjectsClient,
      sortField,
      sortOrder,
      valueListId,
    });
  };
}
