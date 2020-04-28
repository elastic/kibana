/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IRouter, Logger, RequestHandler } from 'kibana/server';
import { EndpointAppContext } from '../types';
import { IndexPatternGetParamsResult } from '../../common/types';
import { AlertConstants } from '../../common/alert_constants';
import { indexPatternGetParamsSchema } from '../../common/schema/index_pattern';

function handleIndexPattern(
  log: Logger,
  endpointAppContext: EndpointAppContext
): RequestHandler<IndexPatternGetParamsResult> {
  return async (context, req, res) => {
    try {
      const indexRetriever = endpointAppContext.service.getIndexPatternRetriever();
      return res.ok({
        body: {
          indexPattern: await indexRetriever.getIndexPattern(context, req.params.datasetPath),
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
      path: `${AlertConstants.INDEX_PATTERN_ROUTE}/{datasetPath}`,
      validate: { params: indexPatternGetParamsSchema },
      options: { authRequired: true },
    },
    handleIndexPattern(log, endpointAppContext)
  );
}
