/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RequestHandler, Logger } from 'kibana/server';
import { TypeOf } from '@kbn/config-schema';
import { validateTree } from '../../../../../common/endpoint/schema/resolver';
import { Fetcher } from './utils/fetch';

export function handleTree(
  log: Logger
): RequestHandler<unknown, unknown, TypeOf<typeof validateTree.body>> {
  return async (context, req, res) => {
    try {
      const client = context.core.elasticsearch.client;
      const fetcher = new Fetcher(client);
      const body = await fetcher.tree(req.body);
      return res.ok({
        body,
      });
    } catch (err) {
      log.warn(err);
      return res.internalError({ body: 'Error retrieving tree.' });
    }
  };
}
