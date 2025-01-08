/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type {
  BulkOperationContainer,
  BulkRequest,
  BulkResponse,
  DeleteRequest,
  DeleteResponse,
  IndexRequest,
  IndexResponse,
  SearchRequest,
} from '@elastic/elasticsearch/lib/api/types';
import { InferSearchResponseOf } from '@kbn/es-types';
import { StorageFieldTypeOf, StorageMappingProperty } from './types';

interface StorageSchemaProperties {
  [x: string]: StorageMappingProperty;
}

export interface StorageSchema {
  properties: StorageSchemaProperties;
}

interface StorageSettingsBase {
  schema: StorageSchema;
}

export interface IndexStorageSettings extends StorageSettingsBase {
  name: string;
}

export type StorageSettings = IndexStorageSettings;

export type StorageAdapterSearchRequest = Omit<SearchRequest, 'index'>;
export type StorageAdapterSearchResponse<
  TDocument,
  TSearchRequest extends Omit<SearchRequest, 'index'>
> = InferSearchResponseOf<TDocument, TSearchRequest>;

export type StorageAdapterBulkOperation = Pick<BulkOperationContainer, 'delete' | 'index'>;

export type StorageAdapterBulkRequest<TDocument extends Record<string, any>> = Omit<
  BulkRequest,
  'operations' | 'index'
> & {
  operations: Array<StorageAdapterBulkOperation | TDocument>;
};
export type StorageAdapterBulkResponse = BulkResponse;

export type StorageAdapterDeleteRequest = DeleteRequest;
export type StorageAdapterDeleteResponse = DeleteResponse;

export type StorageAdapterIndexRequest<TDocument = unknown> = Omit<
  IndexRequest<TDocument>,
  'index'
>;
export type StorageAdapterIndexResponse = IndexResponse;

export interface IStorageAdapter<TStorageSettings extends StorageSettings = never> {
  bulk<TDocument extends Record<string, any>>(
    request: StorageAdapterBulkRequest<TDocument>
  ): Promise<StorageAdapterBulkResponse>;
  search<TDocument, TSearchRequest extends Omit<SearchRequest, 'index'>>(
    request: StorageAdapterSearchRequest
  ): Promise<StorageAdapterSearchResponse<TDocument, TSearchRequest>>;
  index<TDocument>(
    request: StorageAdapterIndexRequest<TDocument>
  ): Promise<StorageAdapterIndexResponse>;
  delete(request: StorageAdapterDeleteRequest): Promise<StorageAdapterDeleteResponse>;
}

export type StorageSettingsOf<TStorageAdapter extends IStorageAdapter<StorageSettings>> =
  TStorageAdapter extends IStorageAdapter<infer TStorageSettings>
    ? TStorageSettings extends StorageSettings
      ? TStorageSettings
      : never
    : never;

export type StorageDocumentOf<TStorageSettings extends StorageSettings> = {
  [TKey in keyof TStorageSettings['schema']['properties']]: StorageFieldTypeOf<
    TStorageSettings['schema']['properties'][TKey]
  >;
} & { _id: string };

export { StorageIndexAdapter } from './index_adapter';
export { StorageClient } from './storage_client';
export { types } from './types';
