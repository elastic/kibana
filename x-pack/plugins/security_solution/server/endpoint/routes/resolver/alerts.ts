/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { TypeOf } from '@kbn/config-schema';
import { RequestHandler, Logger } from 'kibana/server';
import { validateAlerts } from '../../../../common/endpoint/schema/resolver';
import { Fetcher } from './utils/fetch';
import { EndpointAppContext } from '../../types';

export function handleAlerts(
  log: Logger,
  endpointAppContext: EndpointAppContext
): RequestHandler<TypeOf<typeof validateAlerts.params>, TypeOf<typeof validateAlerts.query>> {
  return async (context, req, res) => {
    const {
      params: { id },
      query: { alerts, afterAlert, legacyEndpointID: endpointID },
    } = req;
    try {
      const indexRetriever = endpointAppContext.service.getIndexPatternRetriever();
      const client = context.core.elasticsearch.legacy.client;
      const indexPattern = await indexRetriever.getEventIndexPattern(context);

      const fetcher = new Fetcher(client, id, indexPattern, endpointID);

      return res.ok({
        body: await fetcher.alerts(alerts, afterAlert),
      });
    } catch (err) {
      log.warn(err);
      return res.internalError({ body: err });
    }
  };
}
