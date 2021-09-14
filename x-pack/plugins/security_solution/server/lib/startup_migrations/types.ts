/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SavedObject,
  SavedObjectsBulkUpdateObject,
  SavedObjectsClientContract,
  SavedObjectsFindResult,
  SavedObjectsResolveResponse,
} from 'kibana/server';
import { Logger } from '../../../../../../src/core/server';
import { EncryptedSavedObjectsClient } from '../../../../encrypted_saved_objects/server';

export interface UpdateObjectsOptions<T> {
  logger: Logger;
  savedObject: SavedObjectsFindResult<T>;
  joins: Array<SavedObject<unknown>>;
  encryptedSavedObjectsClient: EncryptedSavedObjectsClient | undefined;
}

export interface JoinOptions<T> {
  savedObject: SavedObjectsFindResult<T>;
  savedObjectsClient: SavedObjectsClientContract;
  logger: Logger;
}

/**
 * Similar to "SavedObjectsType" from `src/core/server/saved_objects/types.ts` in a few ways, but the rest
 * is join abilities, delete abilities, and the ability to escape hatch in case you need to write your own type
 * of "afterStartup" migration
 * See {@link SavedObjectsType}
 */
export interface MigrationTask<T> {
  /**
   * The name of the migration
   */
  name: string;

  /**
   * The sem ver of when this first appeared. Migrations are ordered always in earlier versions running first
   * and then later versions next.
   */
  version: string;

  /**
   * Escape hatch if defined will run first before any other functions defined are run. You can do anything such as
   * creating, updating, querying, reading, and deleting saved objects. Use this as a last resort only as
   * this is the most dangerous mechanism instead of using the other functions.
   */
  escapeHatch?: ({
    logger,
    savedObjectsClient,
    encryptedSavedObjectsClient,
  }: {
    logger: Logger;
    savedObjectsClient: SavedObjectsClientContract;
    encryptedSavedObjectsClient: EncryptedSavedObjectsClient | undefined;
  }) => Promise<void>;

  /**
   * This runs last within a migration task. If you only give a type, then all those saved objects will be deleted
   * across all spaces. If you give it a type with a filter or namespace(s) then it will focus on those for
   * deletions. If you decide to use the escapeHatch, then you will be able to delete any saved object and this is
   * the least safe way of deleting saved objects.
   *
   * @example
   * Deleting all types of "foo" and "bar"
   * ```ts
   * {
   *   deleteSavedObjects: [{ type: 'foo' }, { type: 'bar' }]
   * }
   * ```
   */
  deleteSavedObjects?: Array<{
    type: string | string[];
    filter?: string;
    /**
     * The search operator to use with the provided filter. Defaults to `OR`
     */
    defaultSearchOperator?: 'AND' | 'OR';
  }>;

  defineJoin?: {
    type: string | string[];
    filter?: string;
    defaultSearchOperator?: 'AND' | 'OR';
    join: ({
      savedObject,
      savedObjectsClient,
      logger,
    }: JoinOptions<T>) => Array<Promise<SavedObjectsResolveResponse<unknown>>>;
    updateObjects: ({
      savedObject,
      joins,
      encryptedSavedObjectsClient,
      logger,
    }: UpdateObjectsOptions<T>) => Promise<Array<SavedObjectsBulkUpdateObject<unknown>>>;
  };
}
