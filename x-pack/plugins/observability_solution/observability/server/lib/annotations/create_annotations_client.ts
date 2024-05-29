/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient, Logger } from '@kbn/core/server';
import Boom from '@hapi/boom';
import { ILicense } from '@kbn/licensing-plugin/server';
import { ANNOTATION_RESOURCES_VERSION } from './index_templates/annotation_index_templates';
import { ANNOTATION_MAPPINGS } from './component_templates/annotation_mappings_template';
import {
  Annotation,
  CreateAnnotationParams,
  DeleteAnnotationParams,
  GetByIdAnnotationParams,
  FindAnnotationParams,
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

  const initIndex = () =>
    createOrUpdateIndex({
      index: index + `-v${ANNOTATION_RESOURCES_VERSION}`,
      mappings: ANNOTATION_MAPPINGS,
      client: esClient,
      logger,
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
    get index() {
      return index;
    },
    create: ensureGoldLicense(
      async (
        createParams: CreateAnnotationParams
      ): Promise<{ _id: string; _index: string; _source: Annotation }> => {
        const indexExists = await unwrapEsResponse(
          esClient.indices.exists(
            {
              index: index + `-v${ANNOTATION_RESOURCES_VERSION}`,
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
              index: index + `-v${ANNOTATION_RESOURCES_VERSION}`,
              body: annotation,
              refresh: 'wait_for',
            },
            { meta: true }
          )
        );

        return (
          await esClient.get<Annotation>(
            {
              index: index + `-v${ANNOTATION_RESOURCES_VERSION}`,
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
              index: index + `-v${ANNOTATION_RESOURCES_VERSION}`,
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
              // expand_wildcards: 'all',
            },
            { meta: true }
          )
        ).body as { _id: string; _index: string; _source: Annotation };
      }
    ),
    getById: ensureGoldLicense(async (getByIdParams: GetByIdAnnotationParams) => {
      const { id } = getByIdParams;

      const response = await esClient.search({
        index: index + `-*`,
        expand_wildcards: 'all',
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
      const { start, end, sloId, sloInstanceId } = findParams ?? {};

      const result = await esClient.search({
        index: index + `-*`,
        expand_wildcards: 'all',
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
            ],
          },
        },
      });
      return result.hits.hits.map((hit) => ({ ...(hit._source as Annotation), id: hit._id }));
    }),
    delete: ensureGoldLicense(async (deleteParams: DeleteAnnotationParams) => {
      const { id } = deleteParams;

      return await esClient.deleteByQuery({
        index: index + `-*`,
        expand_wildcards: 'all',
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
