/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { APICaller, Logger } from 'kibana/server';
import * as t from 'io-ts';
import { SearchResponse, Client } from 'elasticsearch';
import {
  createAnnotationRt,
  searchAnnotationsRt,
  deleteAnnotationRt,
  Annotation,
  getAnnotationByIdRt,
} from '../../../common/annotations';
import { PromiseReturnType } from '../../../../apm/typings/common';
import { createOrUpdateIndex } from '../../utils/create_or_update_index';

type SearchParams = t.TypeOf<typeof searchAnnotationsRt>;
type CreateParams = t.TypeOf<typeof createAnnotationRt>;
type DeleteParams = t.TypeOf<typeof deleteAnnotationRt>;
type GetByIdParams = t.TypeOf<typeof getAnnotationByIdRt>;

interface IndexDocumentResponse {
  _shards: {
    total: number;
    failed: number;
    successful: number;
  };
  _index: string;
  _type: string;
  _id: string;
  _version: number;
  _seq_no: number;
  _primary_term: number;
  result: string;
}

export function createAnnotationsClient(params: {
  index: string;
  apiCaller: APICaller;
  logger: Logger;
}) {
  const { index, apiCaller, logger } = params;

  const initIndex = () =>
    createOrUpdateIndex({
      index,
      mappings: {
        dynamic: 'strict',
        properties: {
          annotation: {
            properties: {
              type: {
                type: 'keyword',
              },
            },
          },
          message: {
            type: 'text',
          },
          tags: {
            type: 'keyword',
          },
          '@timestamp': {
            type: 'date',
          },
          event: {
            properties: {
              created: {
                type: 'date',
              },
            },
          },
          service: {
            properties: {
              name: {
                type: 'keyword',
              },
              environment: {
                type: 'keyword',
              },
              version: {
                type: 'keyword',
              },
            },
          },
        },
      },
      apiCaller,
      logger,
    });

  return {
    search: async (searchParams: SearchParams): Promise<SearchResponse<Annotation>> => {
      const { start, end, size, annotation, tags, filter } = searchParams;

      try {
        return await apiCaller('search', {
          index,
          body: {
            size: size ?? 50,
            query: {
              bool: {
                filter: [
                  {
                    range: {
                      '@timestamp': {
                        gte: start,
                        lt: end,
                      },
                    },
                  },
                  ...(annotation?.type ? [{ term: { 'annotation.type': annotation.type } }] : []),
                  ...(tags ? [{ terms: { tags } }] : []),
                  ...(filter ? [filter] : []),
                ],
              },
            },
          },
        });
      } catch (err) {
        if (err.body?.error?.type !== 'index_not_found_exception') {
          throw err;
        }
        return {
          hits: {
            total: 0,
            max_score: 0,
            hits: [],
          },
          took: 0,
          _shards: {
            failed: 0,
            skipped: 0,
            successful: 0,
            total: 0,
          },
          timed_out: false,
        };
      }
    },
    create: async (
      createParams: CreateParams
    ): Promise<{ _id: string; _index: string; _source: Annotation }> => {
      await initIndex();

      const annotation = {
        ...createParams,
        event: {
          created: new Date().toISOString(),
        },
      };

      const response = (await apiCaller('index', {
        index,
        body: annotation,
        refresh: 'wait_for',
      })) as IndexDocumentResponse;

      return {
        _id: response._id,
        _index: response._index,
        _source: annotation,
      };
    },
    getById: async (getByIdParams: GetByIdParams) => {
      const { id } = getByIdParams;

      return apiCaller('get', {
        id,
        index,
      });
    },
    delete: async (deleteParams: DeleteParams) => {
      const { id } = deleteParams;

      const response = (await apiCaller('delete', {
        index,
        id,
        refresh: 'wait_for',
      })) as PromiseReturnType<Client['delete']>;
      return response;
    },
  };
}
