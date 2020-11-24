/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RequestHandler, Logger } from 'kibana/server';
import { TypeOf } from '@kbn/config-schema';
import { eventsIndexPattern, alertsIndexPattern } from '../../../../common/endpoint/constants';
import { validateTreeEntityID } from '../../../../common/endpoint/schema/resolver';
import { Fetcher } from './utils/fetch';
import { EndpointAppContext } from '../../types';

export function handleTree(
  log: Logger,
  endpointAppContext: EndpointAppContext
): RequestHandler<
  TypeOf<typeof validateTreeEntityID.params>,
  TypeOf<typeof validateTreeEntityID.query>
> {
  return async (context, req, res) => {
    try {
      const client = context.core.elasticsearch.legacy.client;

      const fetcher = new Fetcher(
        client,
        req.params.id,
        eventsIndexPattern,
        alertsIndexPattern,
        req.query.legacyEndpointID
      );

      const tree = await fetcher.tree(req.query);

      return res.ok({
        body: tree.render(),
      });
    } catch (err) {
      log.warn(err);
      return res.internalError({ body: 'Error retrieving tree.' });
    }
  };
}
