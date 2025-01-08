/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { withSpan } from '@kbn/apm-utils';
import { Logger } from '@kbn/core/server';
import type { SearchRequest } from '@elastic/elasticsearch/lib/api/types';
import {
  IStorageAdapter,
  StorageAdapterBulkOperation,
  StorageAdapterBulkResponse,
  StorageAdapterDeleteResponse,
  StorageAdapterIndexResponse,
  StorageDocumentOf,
  StorageSettings,
} from '.';

type StrictSearchRequest = SearchRequest & {
  index: string | string[];
  track_total_hits: number | boolean;
  size: number;
};

type StorageBulkOperation<TDocument extends { _id?: string }> =
  | {
      index: { document: Omit<TDocument, '_id'>; _id?: string };
    }
  | { delete: { _id: string } };

export class StorageClient<TStorageSettings extends StorageSettings> {
  constructor(private readonly storage: IStorageAdapter<TStorageSettings>, logger: Logger) {}

  search<TSearchRequest extends Omit<StrictSearchRequest, 'index'>>(
    operationName: string,
    request: TSearchRequest
  ) {
    return withSpan(operationName, () =>
      this.storage.search<StorageDocumentOf<TStorageSettings>, Omit<TSearchRequest, 'index'>>(
        request
      )
    );
  }

  async index({
    id,
    document,
  }: {
    id?: string;
    document: Omit<StorageDocumentOf<TStorageSettings>, '_id'>;
  }): Promise<StorageAdapterIndexResponse> {
    return await this.storage.index<Omit<StorageDocumentOf<TStorageSettings>, '_id'>>({
      document,
      refresh: 'wait_for',
      id,
    });
  }

  async delete(id: string): Promise<StorageAdapterDeleteResponse> {
    const searchResponse = await this.storage.search({
      query: {
        bool: {
          filter: [
            {
              term: {
                id,
              },
            },
          ],
        },
      },
    });

    const document = searchResponse.hits.hits[0];

    let deleted: boolean = false;

    if (document) {
      await this.storage.delete({ id, index: document._index });
      deleted = true;
    }

    return { acknowledged: true, result: deleted ? 'deleted' : 'not_found' };
  }

  async bulk(
    operations: Array<StorageBulkOperation<StorageDocumentOf<TStorageSettings>>>
  ): Promise<StorageAdapterBulkResponse> {
    return await this.storage.bulk({
      refresh: 'wait_for',
      operations: operations.flatMap((operation): StorageAdapterBulkOperation[] => {
        if ('index' in operation) {
          return [
            {
              index: {
                _id: operation.index._id,
              },
            },
            operation.index.document,
          ];
        }

        return [operation];
      }),
    });
  }
}
