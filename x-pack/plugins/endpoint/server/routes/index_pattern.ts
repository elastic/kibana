/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IRouter, Logger, RequestHandler } from 'kibana/server';
import { EndpointAppContext } from '../types';
import { IndexPatternGetParamsResult, IndexPatternGetQueryParamsResult } from '../../common/types';
import {
  indexPatternGetParamsSchema,
  indexPatternGetQueryParamsSchema,
} from '../../common/schema/index_pattern';
import { IndexPatternRetriever } from '../index_pattern';

function handleIndexPattern(
  log: Logger,
  indexRetriever: IndexPatternRetriever
): RequestHandler<IndexPatternGetParamsResult, IndexPatternGetQueryParamsResult> {
  return async (context, req, res) => {
    try {
      return res.ok({
        body: {
          indexPattern: await indexRetriever.get(
            context.core.savedObjects.client,
            req.params.datasetPath,
            req.query.version
          ),
        },
      });
    } catch (error) {
      log.warn(error);
      return res.notFound({ body: error });
    }
  };
}

export function registerIndexPatternRoute(router: IRouter, endpointAppContext: EndpointAppContext) {
  const log = endpointAppContext.logFactory.get('index_pattern');

  router.get(
    {
      path: '/api/endpoint/index_pattern/{datasetPath}',
      validate: { params: indexPatternGetParamsSchema, query: indexPatternGetQueryParamsSchema },
      options: { authRequired: true },
    },
    handleIndexPattern(log, endpointAppContext.indexPatternRetriever)
  );
}
