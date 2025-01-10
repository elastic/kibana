/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { withSpan } from '@kbn/apm-utils';
import { Logger } from '@kbn/core/server';
import { compact } from 'lodash';
import {
  IStorageAdapter,
  StorageAdapterBulkOperation,
  StorageDocumentOf,
  StorageSettings,
} from '.';
import { ObservabilityESSearchRequest } from '../client/create_observability_es_client';

type StorageBulkOperation<TDocument extends { _id?: string }> =
  | {
      index: { document: Omit<TDocument, '_id'>; _id?: string };
    }
  | { delete: { _id: string } };

export class StorageClient<TStorageSettings extends StorageSettings> {
  constructor(private readonly storage: IStorageAdapter<TStorageSettings>, logger: Logger) {}

  search<TSearchRequest extends Omit<ObservabilityESSearchRequest, 'index'>>(
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
  }) {
    await this.storage.index<Omit<StorageDocumentOf<TStorageSettings>, '_id'>>({
      document,
      refresh: 'wait_for',
      id,
    });
  }

  async delete(id: string) {
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

    return { acknowledged: true, deleted };
  }

  async bulk(operations: Array<StorageBulkOperation<StorageDocumentOf<TStorageSettings>>>) {
    const result = await this.storage.bulk({
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

    if (result.errors) {
      const errors = compact(
        result.items.map((item) => {
          const error = Object.values(item).find((operation) => operation.error)?.error;
          return error;
        })
      );
      return {
        errors,
      };
    }

    return {
      acknowledged: true,
    };
  }
}
