/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RequestHandler, Logger } from 'kibana/server';
import { TypeOf } from '@kbn/config-schema';
import { validateChildren } from '../../../common/schema/resolver';
import { Fetcher } from './utils/fetch';
import { EndpointAppContext } from '../../types';

export function handleChildren(
  log: Logger,
  endpointAppContext: EndpointAppContext
): RequestHandler<TypeOf<typeof validateChildren.params>, TypeOf<typeof validateChildren.query>> {
  return async (context, req, res) => {
    const {
      params: { id },
      query: { children, generations, afterChild, legacyEndpointID: endpointID },
    } = req;
    try {
      const indexRetriever = endpointAppContext.service.getIndexPatternRetriever();
      const indexPattern = await indexRetriever.getEventIndexPattern(context);

      const client = context.core.elasticsearch.dataClient;

      const fetcher = new Fetcher(client, id, indexPattern, endpointID);
      const tree = await fetcher.children(children, generations, afterChild);

      return res.ok({
        body: tree.render(),
      });
    } catch (err) {
      log.warn(err);
      return res.internalError({ body: err });
    }
  };
}
