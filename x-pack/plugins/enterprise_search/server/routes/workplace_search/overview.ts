/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import fetch from 'node-fetch';

import { IRouteDependencies } from '../../plugin';

export function registerWSOverviewRoute({ router, config, log }: IRouteDependencies) {
  router.get(
    {
      path: '/api/workplace_search/overview',
      validate: false,
    },
    async (context, request, response) => {
      try {
        const entSearchUrl = config.host as string;
        const url = `${encodeURI(entSearchUrl)}/ws/org`;

        const overviewResponse = await fetch(url, {
          headers: { Authorization: request.headers.authorization as string },
        });

        const body = await overviewResponse.json();
        const hasValidData = typeof body?.accountsCount === 'number';

        if (hasValidData) {
          return response.ok({
            body,
            headers: { 'content-type': 'application/json' },
          });
        } else {
          // Either a completely incorrect Enterprise Search host URL was configured, or Workplace Search is returning bad data
          throw new Error(`Invalid data received from Workplace Search: ${JSON.stringify(body)}`);
        }
      } catch (e) {
        log.error(`Cannot connect to Workplace Search: ${e.toString()}`);
        if (e instanceof Error) log.debug(e.stack as string);

        return response.notFound({ body: 'cannot-connect' });
      }
    }
  );
}
