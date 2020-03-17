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
import { IndexPatternService } from '../../../ingest_manager/server';
import { IngestIndexPatternRetriever } from '../index_pattern';

function handleIndexPattern(
  log: Logger,
  indexPatternService: IndexPatternService
): RequestHandler<IndexPatternGetParamsResult, IndexPatternGetQueryParamsResult> {
  return async (context, req, res) => {
    try {
      const indexPattern = new IngestIndexPatternRetriever(
        indexPatternService,
        context.core.savedObjects.client,
        req.params.datasetPath,
        log,
        req.query?.version
      );
      return res.ok({ body: await indexPattern.get() });
    } catch (e) {
      log.warn(e);
      return res.internalError({ body: e });
    }
  };
}

export function registerIndexPatternRoute(router: IRouter, endpointAppContext: EndpointAppContext) {
  const log = endpointAppContext.logFactory.get('index_pattern');
  const indexPatternService = endpointAppContext.ingestManager.indexPatternService;

  router.get(
    {
      path: '/api/endpoint/index_pattern/{datasetPath}',
      validate: { params: indexPatternGetParamsSchema, query: indexPatternGetQueryParamsSchema },
      options: { authRequired: true },
    },
    handleIndexPattern(log, indexPatternService)
  );
}
