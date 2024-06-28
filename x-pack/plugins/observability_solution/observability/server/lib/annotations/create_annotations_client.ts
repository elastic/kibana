/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient, Logger } from '@kbn/core/server';
import Boom from '@hapi/boom';
import { ILicense } from '@kbn/licensing-plugin/server';
import { ANNOTATION_RESOURCES_VERSION, ANNOTATION_MAPPINGS } from './mappings/annotation_mappings';
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
  const { index: rawIndex, esClient, logger, license } = params;

  const index =
    rawIndex === DEFAULT_ANNOTATION_INDEX
      ? rawIndex + `-v${ANNOTATION_RESOURCES_VERSION}`
      : rawIndex;

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
        index: rawIndex + `*`,
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

      const result = await esClient.search({
        index: rawIndex + `*`,
        size: 10000,
        query: {
          bool: {
            filter: [
              {
                range: {
                  '@timestamp': {
                    gte: start,
                    lte: end,
                  },
                },
              },
            ],
            should: [
              ...(sloId
                ? [
                    {
                      term: {
                        'slo.id': sloId,
                      },
                    },
                  ]
                : []),
              ...(sloInstanceId && sloInstanceId !== '*'
                ? [
                    {
                      term: {
                        'slo.instanceId': sloInstanceId,
                      },
                    },
                  ]
                : []),
              ...(serviceName
                ? [
                    {
                      term: {
                        'service.name': serviceName,
                      },
                    },
                  ]
                : []),
            ],
          },
        },
      });
      return result.hits.hits.map((hit) => ({ ...(hit._source as Annotation), id: hit._id }));
    }),
    delete: ensureGoldLicense(async (deleteParams: DeleteAnnotationParams) => {
      const { id } = deleteParams;

      return await esClient.deleteByQuery({
        index: rawIndex + `-*`,
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
