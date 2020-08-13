/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import {
  SavedObjectsClientContract,
  SavedObjectsUpdateOptions,
  SavedObjectsUpdateResponse,
  SavedObjectsBulkUpdateOptions,
  SavedObjectsBulkUpdateObject,
  SavedObjectsBulkUpdateResponse,
} from 'kibana/server';

export interface SavedObjectsBulkUpdateObjectWithoutPartialUpdates<T = unknown>
  extends SavedObjectsBulkUpdateObject {
  attributes: T;
}

export interface SavedObjectsBulkUpdateResponseWithoutPartialUpdates<T = unknown>
  extends SavedObjectsBulkUpdateResponse {
  saved_objects: Array<SavedObjectsUpdateResponseWithoutPartialUpdates<T>>;
}

export interface SavedObjectsUpdateResponseWithoutPartialUpdates<T = unknown>
  extends SavedObjectsUpdateResponse {
  attributes: T;
}

export interface SavedObjectsClientWithoutPartialUpdates extends SavedObjectsClientContract {
  update<T = unknown>(
    type: string,
    id: string,
    attributes: T,
    options: SavedObjectsUpdateOptions
  ): Promise<SavedObjectsUpdateResponse<T>>;

  bulkUpdate<T = unknown>(
    objects: Array<SavedObjectsBulkUpdateObjectWithoutPartialUpdates<T>>,
    options?: SavedObjectsBulkUpdateOptions
  ): Promise<SavedObjectsBulkUpdateResponse<T>>;
}
