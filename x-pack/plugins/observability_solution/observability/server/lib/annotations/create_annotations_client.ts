/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient, Logger } from '@kbn/core/server';
import Boom from '@hapi/boom';
import { ILicense } from '@kbn/licensing-plugin/server';
import { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { ANNOTATION_MAPPINGS } from './mappings/annotation_mappings';
import {
  Annotation,
  CreateAnnotationParams,
  DeleteAnnotationParams,
  GetByIdAnnotationParams,
  FindAnnotationParams,
  DEFAULT_ANNOTATION_INDEX,
} from '../../../common/annotations';
import { createOrUpdateIndex } from '../../utils/create_or_update_index';
import { unwrapEsResponse } from '../../../common/utils/unwrap_es_response';

export function createAnnotationsClient(params: {
  index: string;
  esClient: ElasticsearchClient;
  logger: Logger;
  license?: ILicense;
}) {
  const { index, esClient, logger, license } = params;

  const readIndex =
    index === DEFAULT_ANNOTATION_INDEX ? index : `${index}*,${DEFAULT_ANNOTATION_INDEX}`;

  const initIndex = () =>
    createOrUpdateIndex({
      index,
      client: esClient,
      logger,
      mappings: ANNOTATION_MAPPINGS,
    });

  function ensureGoldLicense<T extends (...args: any[]) => any>(fn: T): T {
    return ((...args) => {
      if (!license?.hasAtLeast('gold')) {
        throw Boom.forbidden('Annotations require at least a gold license or a trial license.');
      }
      return fn(...args);
    }) as T;
  }

  const updateMappings = async () => {
    // get index mapping
    const currentMappings = await esClient.indices.getMapping({
      index,
    });
    const mappings = currentMappings?.[index].mappings;

    if (mappings.dynamic) {
      return;
    }

    // update index mapping
    await initIndex();
  };

  return {
    index,
    create: ensureGoldLicense(
      async (
        createParams: CreateAnnotationParams
      ): Promise<{ _id: string; _index: string; _source: Annotation }> => {
        const indexExists = await unwrapEsResponse(
          esClient.indices.exists(
            {
              index,
            },
            { meta: true }
          )
        );

        if (!indexExists) {
          await initIndex();
        } else {
          await updateMappings();
        }

        const annotation = {
          ...createParams,
          event: {
            created: new Date().toISOString(),
          },
        };

        const body = await unwrapEsResponse(
          esClient.index(
            {
              index,
              body: annotation,
              refresh: 'wait_for',
            },
            { meta: true }
          )
        );

        return (
          await esClient.get<Annotation>(
            {
              index,
              id: body._id,
            },
            { meta: true }
          )
        ).body as { _id: string; _index: string; _source: Annotation };
      }
    ),
    update: ensureGoldLicense(
      async (
        updateParams: Annotation
      ): Promise<{ _id: string; _index: string; _source: Annotation }> => {
        const { id, ...rest } = updateParams;

        const annotation = {
          ...rest,
          event: {
            created: new Date().toISOString(),
          },
        };

        const body = await unwrapEsResponse(
          esClient.index(
            {
              index,
              id,
              body: annotation,
              refresh: 'wait_for',
            },
            { meta: true }
          )
        );

        return (
          await esClient.get<Annotation>(
            {
              index,
              id: body._id,
            },
            { meta: true }
          )
        ).body as { _id: string; _index: string; _source: Annotation };
      }
    ),
    getById: ensureGoldLicense(async (getByIdParams: GetByIdAnnotationParams) => {
      const { id } = getByIdParams;

      const response = await esClient.search({
        index: readIndex,
        ignore_unavailable: true,
        query: {
          bool: {
            filter: [
              {
                term: {
                  _id: id,
                },
              },
            ],
          },
        },
      });
      return response.hits.hits?.[0];
    }),
    find: ensureGoldLicense(async (findParams: FindAnnotationParams) => {
      const { start, end, sloId, sloInstanceId, serviceName } = findParams ?? {};

      const shouldClauses: QueryDslQueryContainer[] = [];
      if (sloId || sloInstanceId) {
        const sloFilters: QueryDslQueryContainer[] = [];
        if (sloId) {
          sloFilters.push({
            nested: {
              path: 'slos',
              query: {
                match_phrase: {
                  'slos.id': sloId,
                },
              },
            },
          });
        }
        if (sloInstanceId) {
          sloFilters.push({
            nested: {
              path: 'slos',
              query: {
                match_phrase: {
                  'slos.instanceId': sloInstanceId,
                },
              },
            },
          });
        }
        const sloFilter: QueryDslQueryContainer = {
          bool: {
            filter: sloFilters,
          },
        };

        const allSloFilter: QueryDslQueryContainer = {
          bool: {
            filter: [
              {
                nested: {
                  path: 'slos',
                  query: {
                    bool: {
                      should: [
                        {
                          term: {
                            'slos.id': '*',
                          },
                        },
                      ],
                    },
                  },
                },
              },
            ],
          },
        };
        const query: QueryDslQueryContainer = {
          bool: {
            should: [allSloFilter, sloFilter],
          },
        };
        shouldClauses.push(query);
      }

      if (serviceName) {
        shouldClauses.push({
          term: {
            'service.name': serviceName,
          },
        });
      }

      const result = await esClient.search({
        index: readIndex,
        size: 10000,
        ignore_unavailable: true,
        query: {
          bool: {
            filter: [
              {
                range: {
                  '@timestamp': {
                    gte: start ?? 'now-30d',
                    lte: end ?? 'now',
                  },
                },
              },
              {
                bool: {
                  should: shouldClauses,
                  minimum_should_match: 1,
                },
              },
            ],
          },
        },
      });
      const items = result.hits.hits.map((hit) => ({
        ...(hit._source as Annotation),
        id: hit._id,
      }));
      return {
        items,
        total: result.hits.total.value,
      };
    }),
    delete: ensureGoldLicense(async (deleteParams: DeleteAnnotationParams) => {
      const { id } = deleteParams;

      return await esClient.deleteByQuery({
        index: readIndex,
        ignore_unavailable: true,
        body: {
          query: {
            term: {
              _id: id,
            },
          },
        },
        refresh: true,
      });
    }),
  };
}
