/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import fetch from 'node-fetch';
import querystring from 'querystring';
import { schema } from '@kbn/config-schema';

import { ENGINES_PAGE_SIZE } from '../../../common/constants';

export function registerEnginesRoute({ router, config, log }) {
  router.get(
    {
      path: '/api/app_search/engines',
      validate: {
        query: schema.object({
          type: schema.oneOf([schema.literal('indexed'), schema.literal('meta')]),
          pageIndex: schema.number(),
        }),
      },
    },
    async (context, request, response) => {
      try {
        const appSearchUrl = config.host;
        const { type, pageIndex } = request.query;

        const params = querystring.stringify({
          type,
          'page[current]': pageIndex,
          'page[size]': ENGINES_PAGE_SIZE,
        });
        const url = `${encodeURI(appSearchUrl)}/as/engines/collection?${params}`;

        const enginesResponse = await fetch(url, {
          headers: { Authorization: request.headers.authorization },
        });

        if (enginesResponse.url.endsWith('/login')) {
          log.info('No corresponding App Search account found');
          // Note: Can't use response.unauthorized, Kibana will auto-log out the user
          return response.forbidden({ body: 'no-as-account' });
        }

        const engines = await enginesResponse.json();
        const hasValidData =
          Array.isArray(engines?.results) && typeof engines?.meta?.page?.total_results === 'number';

        if (hasValidData) {
          return response.ok({
            body: engines,
            headers: { 'content-type': 'application/json' },
          });
        } else {
          // Either a completely incorrect Enterprise Search host URL was configured, or App Search is returning bad data
          throw new Error(`Invalid data received from App Search: ${JSON.stringify(engines)}`);
        }
      } catch (e) {
        log.error(`Cannot connect to App Search: ${e.toString()}`);
        if (e instanceof Error) log.debug(e.stack);

        return response.notFound({ body: 'cannot-connect' });
      }
    }
  );
}
