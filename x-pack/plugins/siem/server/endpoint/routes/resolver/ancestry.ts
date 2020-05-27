/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RequestHandler, Logger } from 'kibana/server';
import { TypeOf } from '@kbn/config-schema';
import { validateAncestry } from '../../../../common/endpoint/schema/resolver';
import { Fetcher } from './utils/fetch';
import { EndpointAppContext } from '../../types';

export function handleAncestry(
  log: Logger,
  endpointAppContext: EndpointAppContext
): RequestHandler<TypeOf<typeof validateAncestry.params>, TypeOf<typeof validateAncestry.query>> {
  return async (context, req, res) => {
    const {
      params: { id },
      query: { ancestors, legacyEndpointID: endpointID },
    } = req;
    try {
      const indexRetriever = endpointAppContext.service.getIndexPatternRetriever();

      const client = context.core.elasticsearch.legacy.client;
      const indexPattern = await indexRetriever.getEventIndexPattern(context);

      const fetcher = new Fetcher(client, id, indexPattern, endpointID);
      const ancestorInfo = await fetcher.ancestors(ancestors);

      return res.ok({
        body: ancestorInfo,
      });
    } catch (err) {
      log.warn(err);
      return res.internalError({ body: err });
    }
  };
}
