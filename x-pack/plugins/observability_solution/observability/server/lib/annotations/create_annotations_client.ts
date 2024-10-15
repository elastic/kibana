/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient, Logger } from '@kbn/core/server';
import Boom from '@hapi/boom';
import { ILicense } from '@kbn/licensing-plugin/server';
import { QueryDslQueryContainer, SearchTotalHits } from '@elastic/elasticsearch/lib/api/types';
import { formatAnnotation } from './format_annotations';
import { checkAnnotationsPermissions } from './permissions';
import { ANNOTATION_MAPPINGS } from './mappings/annotation_mappings';
import {
  Annotation,
  CreateAnnotationParams,
  DEFAULT_ANNOTATION_INDEX,
  DeleteAnnotationParams,
  FindAnnotationParams,
  GetByIdAnnotationParams,
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
    index === DEFAULT_ANNOTATION_INDEX ? index : `${index},${DEFAULT_ANNOTATION_INDEX}`;

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

    if (mappings?.properties?.slo) {
      return;
    }

    // update index mapping
    await initIndex();
  };

  const validateAnnotation = (annotation: CreateAnnotationParams | Annotation) => {
    // make sure to check one of message of annotation.title is present
    if (!annotation.message && !annotation.annotation.title) {
      throw Boom.badRequest('Annotation must have a message or a annotation.title');
    }
  };

  return {
    index,
    create: ensureGoldLicense(
      async (
        createParams: CreateAnnotationParams
      ): Promise<{ _id: string; _index: string; _source: Annotation }> => {
        validateAnnotation(createParams);
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
            ...createParams.event,
            created: new Date().toISOString(),
          },
        };
        if (!annotation.annotation.title) {
          // TODO: handle this when we integrate with the APM UI
          annotation.annotation.title = annotation.message;
        }

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

        const document = (
          await esClient.get<Annotation>(
            {
              index,
              id: body._id,
            },
            { meta: true }
          )
        ).body as { _id: string; _index: string; _source: Annotation };
        return {
          _id: document._id,
          _index: document._index,
          _source: formatAnnotation(document._source),
        };
      }
    ),
    update: ensureGoldLicense(
      async (
        updateParams: Annotation
      ): Promise<{ _id: string; _index: string; _source: Annotation }> => {
        validateAnnotation(updateParams);
        await updateMappings();
        const { id, ...rest } = updateParams;

        const annotation = {
          ...rest,
          event: {
            ...rest.event,
            updated: new Date().toISOString(),
          },
        };
        if (!annotation.annotation.title) {
          // TODO: handle this when we integrate with the APM UI
          annotation.annotation.title = annotation.message;
        }

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

      const response = await esClient.search<Annotation>({
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
      const document = response.hits.hits?.[0];
      return {
        ...document,
        _source: formatAnnotation(document._source!),
      };
    }),
    find: ensureGoldLicense(async (findParams: FindAnnotationParams) => {
      const { start, end, sloId, sloInstanceId, serviceName, filter, size } = findParams ?? {};
      const filterJSON = filter ? JSON.parse(filter) : {};

      const termsFilter = Object.keys(filterJSON).map((filterKey) => ({
        term: { [filterKey]: filterJSON[filterKey] },
      }));

      const shouldClauses: QueryDslQueryContainer[] = [];
      if (sloId || sloInstanceId) {
        const query: QueryDslQueryContainer = {
          bool: {
            should: [
              {
                term: {
                  'slo.id': '*',
                },
              },
              {
                bool: {
                  filter: [
                    ...(sloId
                      ? [
                          {
                            match_phrase: {
                              'slo.id': sloId,
                            },
                          },
                        ]
                      : []),
                    ...(sloInstanceId
                      ? [
                          {
                            match_phrase: {
                              'slo.instanceId': sloInstanceId,
                            },
                          },
                        ]
                      : []),
                  ],
                },
              },
            ],
          },
        };
        shouldClauses.push(query);
      }

      const result = await esClient.search({
        index: readIndex,
        size: size ?? 10000,
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
              ...(Object.keys(filterJSON).length !== 0
                ? termsFilter
                : [
                    {
                      bool: {
                        should: [
                          ...(serviceName
                            ? [
                                {
                                  term: {
                                    'service.name': serviceName,
                                  },
                                },
                              ]
                            : []),
                          ...shouldClauses,
                        ],
                      },
                    },
                  ]),
            ],
          },
        },
      });

      const items = result.hits.hits.map((hit) => ({
        ...formatAnnotation(hit._source as Annotation),
        id: hit._id,
      }));

      return {
        items,
        total: (result.hits.total as SearchTotalHits)?.value,
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
    permissions: async () => {
      const permissions = await checkAnnotationsPermissions({ index, esClient });
      const hasGoldLicense = license?.hasAtLeast('gold') ?? false;

      return { index, hasGoldLicense, ...permissions.index[index] };
    },
  };
}
