/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient, Logger } from 'kibana/server';
import * as t from 'io-ts';
import Boom from '@hapi/boom';
import { ILicense } from '../../../../licensing/server';
import {
  createAnnotationRt,
  deleteAnnotationRt,
  Annotation,
  getAnnotationByIdRt,
} from '../../../common/annotations';
import { createOrUpdateIndex } from '../../utils/create_or_update_index';
import { mappings } from './mappings';
import { unwrapEsResponse } from '../../utils/unwrap_es_response';

type CreateParams = t.TypeOf<typeof createAnnotationRt>;
type DeleteParams = t.TypeOf<typeof deleteAnnotationRt>;
type GetByIdParams = t.TypeOf<typeof getAnnotationByIdRt>;

export function createAnnotationsClient(params: {
  index: string;
  esClient: ElasticsearchClient;
  logger: Logger;
  license?: ILicense;
}) {
  const { index, esClient, logger, license } = params;

  const initIndex = () =>
    createOrUpdateIndex({
      index,
      mappings,
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
        createParams: CreateParams
      ): Promise<{ _id: string; _index: string; _source: Annotation }> => {
        const indexExists = await unwrapEsResponse(
          esClient.indices.exists({
            index,
          })
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
          esClient.index({
            index,
            body: annotation,
            refresh: 'wait_for',
          })
        );

        return (
          await esClient.get<Annotation>({
            index,
            id: body._id,
          })
        ).body as { _id: string; _index: string; _source: Annotation };
      }
    ),
    getById: ensureGoldLicense(async (getByIdParams: GetByIdParams) => {
      const { id } = getByIdParams;

      return unwrapEsResponse(
        esClient.get({
          id,
          index,
        })
      );
    }),
    delete: ensureGoldLicense(async (deleteParams: DeleteParams) => {
      const { id } = deleteParams;

      return unwrapEsResponse(
        esClient.delete({
          index,
          id,
          refresh: 'wait_for',
        })
      );
    }),
  };
}
