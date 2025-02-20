/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type {
  BulkRequest,
  BulkResponse,
  DeleteRequest,
  GetRequest,
  GetResponse,
  IndexRequest,
  IndexResponse,
  Result,
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

export type StorageClientSearchRequest = Omit<SearchRequest, 'index'> & {
  track_total_hits: boolean | number;
  size: number;
};

export type StorageClientSearchResponse<
  TDocument,
  TSearchRequest extends Omit<SearchRequest, 'index'>
> = InferSearchResponseOf<TDocument, TSearchRequest>;

export type StorageClientBulkOperation<TDocument extends { _id?: string }> =
  | {
      index: { document: Omit<TDocument, '_id'>; _id?: string };
    }
  | { delete: { _id: string } };

export type StorageClientBulkRequest<TDocument extends Record<string, any>> = Omit<
  BulkRequest,
  'operations' | 'index'
> & {
  operations: Array<StorageClientBulkOperation<TDocument>>;
};
export type StorageClientBulkResponse = BulkResponse;

export type StorageClientDeleteRequest = Omit<DeleteRequest, 'index'>;

export interface StorageClientDeleteResponse {
  acknowledged: boolean;
  result: Extract<Result, 'deleted' | 'not_found'>;
}

export interface StorageClientCleanResponse {
  acknowledged: boolean;
  result: Extract<Result, 'deleted' | 'noop'>;
}

export type StorageClientIndexRequest<TDocument = unknown> = Omit<
  IndexRequest<Omit<TDocument, '_id'>>,
  'index'
>;

export type StorageClientIndexResponse = IndexResponse;

export type StorageClientGetRequest = Omit<GetRequest & SearchRequest, 'index'>;
export type StorageClientGetResponse<TDocument extends Record<string, any>> =
  GetResponse<TDocument>;

export type StorageClientSearch<TStorageSettings extends StorageSettings = never> = <
  TSearchRequest extends StorageClientSearchRequest
>(
  request: TSearchRequest
) => Promise<StorageClientSearchResponse<StorageDocumentOf<TStorageSettings>, TSearchRequest>>;

export type StorageClientBulk<TStorageSettings extends StorageSettings = never> = (
  request: StorageClientBulkRequest<StorageDocumentOf<TStorageSettings>>
) => Promise<StorageClientBulkResponse>;

export type StorageClientIndex<TStorageSettings extends StorageSettings = never> = (
  request: StorageClientIndexRequest<StorageDocumentOf<TStorageSettings>>
) => Promise<StorageClientIndexResponse>;

export type StorageClientDelete = (
  request: StorageClientDeleteRequest
) => Promise<StorageClientDeleteResponse>;

export type StorageClientClean = () => Promise<StorageClientCleanResponse>;

export type StorageClientGet<TStorageSettings extends StorageSettings = never> = (
  request: StorageClientGetRequest
) => Promise<StorageClientGetResponse<StorageDocumentOf<TStorageSettings>>>;

export type StorageClientExistsIndex = () => Promise<boolean>;

export interface IStorageClient<TStorageSettings extends StorageSettings = never> {
  search: StorageClientSearch<TStorageSettings>;
  bulk: StorageClientBulk<TStorageSettings>;
  index: StorageClientIndex<TStorageSettings>;
  delete: StorageClientDelete;
  clean: StorageClientClean;
  get: StorageClientGet<TStorageSettings>;
  existsIndex: StorageClientExistsIndex;
}

export type StorageDocumentOf<TStorageSettings extends StorageSettings> = StorageFieldTypeOf<{
  type: 'object';
  properties: TStorageSettings['schema']['properties'];
}> & { _id: string };

export { StorageIndexAdapter } from './index_adapter';

export { types } from './types';
