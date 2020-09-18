/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { LegacyAPICaller, Logger } from 'kibana/server';
import * as t from 'io-ts';
import { Client } from 'elasticsearch';
import Boom from 'boom';
import { ILicense } from '../../../../licensing/server';
import {
  createAnnotationRt,
  deleteAnnotationRt,
  Annotation,
  getAnnotationByIdRt,
} from '../../../common/annotations';
import { PromiseReturnType } from '../../../typings/common';
import { createOrUpdateIndex } from '../../utils/create_or_update_index';
import { mappings } from './mappings';

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
  apiCaller: LegacyAPICaller;
  logger: Logger;
  license?: ILicense;
}) {
  const { index, apiCaller, logger, license } = params;

  const initIndex = () =>
    createOrUpdateIndex({
      index,
      mappings,
      apiCaller,
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
        const indexExists = await apiCaller('indices.exists', {
          index,
        });

        if (!indexExists) {
          await initIndex();
        }

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

        return apiCaller('get', {
          index,
          id: response._id,
        });
      }
    ),
    getById: ensureGoldLicense(async (getByIdParams: GetByIdParams) => {
      const { id } = getByIdParams;

      return apiCaller('get', {
        id,
        index,
      });
    }),
    delete: ensureGoldLicense(async (deleteParams: DeleteParams) => {
      const { id } = deleteParams;

      const response = (await apiCaller('delete', {
        index,
        id,
        refresh: 'wait_for',
      })) as PromiseReturnType<Client['delete']>;
      return response;
    }),
  };
}
