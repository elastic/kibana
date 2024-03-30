/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidV4 } from 'uuid';
import type {
  BulkOperationContainer,
  BulkOperationType,
  BulkResponseItem,
  Script,
} from '@elastic/elasticsearch/lib/api/types';
import type { Logger, ElasticsearchClient } from '@kbn/core/server';
import { UUID } from '@kbn/elastic-assistant-common';
import { AuthenticatedUser } from '@kbn/security-plugin-types-common';

export interface BulkOperationError {
  message: string;
  status?: number;
  document: {
    id: string;
  };
}

interface WriterBulkResponse {
  errors: BulkOperationError[];
  docs_created: string[];
  docs_deleted: string[];
  docs_updated: unknown[];
  took: number;
}

interface BulkParams<TUpdateParams extends { id: string }, TCreateParams> {
  documentsToCreate?: TCreateParams[];
  documentsToUpdate?: TUpdateParams[];
  documentsToDelete?: string[];
  getUpdateScript: (document: TUpdateParams, updatedAt: string) => Script;
  authenticatedUser?: AuthenticatedUser;
}

export interface DocumentsDataWriter {
  bulk: <TUpdateParams extends { id: string }, TCreateParams>(
    params: BulkParams<TUpdateParams, TCreateParams>
  ) => Promise<WriterBulkResponse>;
}

interface DocumentsDataWriterOptions {
  esClient: ElasticsearchClient;
  index: string;
  spaceId: string;
  user: { id?: UUID; name?: string };
  logger: Logger;
}

export class DocumentsDataWriter implements DocumentsDataWriter {
  constructor(private readonly options: DocumentsDataWriterOptions) {}

  public bulk = async <TUpdateParams extends { id: string }, TCreateParams>(
    params: BulkParams<TUpdateParams, TCreateParams>
  ) => {
    try {
      if (
        !params.documentsToCreate?.length &&
        !params.documentsToUpdate?.length &&
        !params.documentsToDelete?.length
      ) {
        return { errors: [], docs_created: [], docs_deleted: [], docs_updated: [], took: 0 };
      }

      const { errors, items, took } = await this.options.esClient.bulk({
        refresh: 'wait_for',
        body: await this.buildBulkOperations(params),
      });

      return {
        errors: errors ? this.formatErrorsResponse(items) : [],
        docs_created: items
          .filter((item) => item.create?.status === 201 || item.create?.status === 200)
          .map((item) => item.create?._id),
        docs_deleted: items
          .filter((item) => item.delete?.status === 201 || item.delete?.status === 200)
          .map((item) => item.delete?._id),
        docs_updated: items
          .filter((item) => item.update?.status === 201 || item.update?.status === 200)
          .map((item) => item.update?.get?._source),
        took,
      } as WriterBulkResponse;
    } catch (e) {
      this.options.logger.error(`Error bulk actions for documents: ${e.message}`);
      return {
        errors: [
          {
            message: e.message,
            document: {
              id: '',
            },
          },
        ],
        docs_created: [],
        docs_deleted: [],
        docs_updated: [],
        took: 0,
      } as WriterBulkResponse;
    }
  };

  private getUpdateDocumentsQuery = async <TUpdateParams extends { id: string }>(
    documentsToUpdate: TUpdateParams[],
    getUpdateScript: (document: TUpdateParams, updatedAt: string) => Script,
    authenticatedUser?: AuthenticatedUser
  ) => {
    const updatedAt = new Date().toISOString();
    const filterByUser = authenticatedUser
      ? [
          {
            nested: {
              path: 'users',
              query: {
                bool: {
                  must: [
                    {
                      match: authenticatedUser.profile_uid
                        ? { 'users.id': authenticatedUser.profile_uid }
                        : { 'users.name': authenticatedUser.username },
                    },
                  ],
                },
              },
            },
          },
        ]
      : [];

    const responseToUpdate = await this.options.esClient.search({
      body: {
        query: {
          bool: {
            must: [
              {
                bool: {
                  should: [
                    {
                      ids: {
                        values: documentsToUpdate?.map((c) => c.id),
                      },
                    },
                  ],
                },
              },
              ...filterByUser,
            ],
          },
        },
      },
      _source: false,
      ignore_unavailable: true,
      index: this.options.index,
      seq_no_primary_term: true,
      size: 1000,
    });

    const availableDocumentsToUpdate = documentsToUpdate.filter((c) =>
      responseToUpdate?.hits.hits.find((ac) => ac._id === c.id)
    );

    return availableDocumentsToUpdate.flatMap((document) => [
      {
        update: {
          _id: document.id,
          _index: responseToUpdate?.hits.hits.find((c) => c._id === document.id)?._index,
          _source: true,
        },
      },
      {
        script: getUpdateScript(document, updatedAt),
        upsert: { counter: 1 },
      },
    ]);
  };

  private getDeletedocumentsQuery = async (
    documentsToDelete: string[],
    authenticatedUser?: AuthenticatedUser
  ) => {
    const filterByUser = authenticatedUser
      ? [
          {
            nested: {
              path: 'users',
              query: {
                bool: {
                  must: [
                    {
                      match: authenticatedUser.profile_uid
                        ? { 'users.id': authenticatedUser.profile_uid }
                        : { 'users.name': authenticatedUser.username },
                    },
                  ],
                },
              },
            },
          },
        ]
      : [];

    const responseToDelete = await this.options.esClient.search({
      body: {
        query: {
          bool: {
            must: [
              {
                bool: {
                  should: [
                    {
                      ids: {
                        values: documentsToDelete,
                      },
                    },
                  ],
                },
              },
              ...filterByUser,
            ],
          },
        },
      },
      _source: false,
      ignore_unavailable: true,
      index: this.options.index,
      seq_no_primary_term: true,
      size: 1000,
    });

    return (
      responseToDelete?.hits.hits.map((c) => ({
        delete: {
          _id: c._id,
          _index: c._index,
        },
      })) ?? []
    );
  };

  private buildBulkOperations = async <TUpdateParams extends { id: string }, TCreateParams>(
    params: BulkParams<TUpdateParams, TCreateParams>
  ): Promise<BulkOperationContainer[]> => {
    const documentCreateBody =
      params.authenticatedUser && params.documentsToCreate
        ? params.documentsToCreate.flatMap((document) => [
            { create: { _index: this.options.index, _id: uuidV4() } },
            document,
          ])
        : [];

    const documentDeletedBody =
      params.documentsToDelete && params.documentsToDelete.length > 0
        ? await this.getDeletedocumentsQuery(params.documentsToDelete, params.authenticatedUser)
        : [];

    const documentUpdatedBody =
      params.documentsToUpdate && params.documentsToUpdate.length > 0
        ? await this.getUpdateDocumentsQuery(
            params.documentsToUpdate,
            params.getUpdateScript,
            params.authenticatedUser
          )
        : [];

    return [
      ...documentCreateBody,
      ...documentUpdatedBody,
      ...documentDeletedBody,
    ] as BulkOperationContainer[];
  };

  private formatErrorsResponse = (
    items: Array<Partial<Record<BulkOperationType, BulkResponseItem>>>
  ) => {
    return items
      .map((item) =>
        item.create?.error
          ? {
              message: item.create.error?.reason,
              status: item.create.status,
              document: {
                id: item.create._id,
              },
            }
          : item.update?.error
          ? {
              message: item.update.error?.reason,
              status: item.update.status,
              document: {
                id: item.update._id,
              },
            }
          : item.delete?.error
          ? {
              message: item.delete?.error?.reason,
              status: item.delete?.status,
              document: {
                id: item.delete?._id,
              },
            }
          : undefined
      )
      .filter((e) => e !== undefined);
  };
}
