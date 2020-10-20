/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { TypeOf } from '@kbn/config-schema';
import { RequestHandler, Logger } from 'kibana/server';
import { validateAlerts } from '../../../../common/endpoint/schema/resolver';
import { alertsIndexPattern, eventsIndexPattern } from '../../../../common/endpoint/constants';
import { Fetcher } from './utils/fetch';
import { EndpointAppContext } from '../../types';

export function handleAlerts(
  log: Logger,
  endpointAppContext: EndpointAppContext
): RequestHandler<
  TypeOf<typeof validateAlerts.params>,
  TypeOf<typeof validateAlerts.query>,
  TypeOf<typeof validateAlerts.body>
> {
  return async (context, req, res) => {
    const {
      params: { id },
      query: { alerts, afterAlert, legacyEndpointID: endpointID },
      body,
    } = req;
    try {
      const client = context.core.elasticsearch.legacy.client;

      const fetcher = new Fetcher(client, id, eventsIndexPattern, alertsIndexPattern, endpointID);

      return res.ok({
        body: await fetcher.alerts(alerts, afterAlert, body?.filter),
      });
    } catch (err) {
      log.warn(err);
      return res.internalError({ body: err });
    }
  };
}
