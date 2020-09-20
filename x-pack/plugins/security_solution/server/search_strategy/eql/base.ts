/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EqlSearch } from '@elastic/elasticsearch/api/requestParams';
import { TransportRequestOptions } from '@elastic/elasticsearch/lib/Transport';

import { Logger } from 'kibana/server';
import { ISearchStrategy } from '../../../../../../src/plugins/data/server';

export const SECURITY_EQL_SEARCH_STRATEGY = 'security_eql_base';

export const securityEqlSearchStrategyProvider = (logger: Logger): ISearchStrategy => {
  return {
    search: async (context, request, options) => {
      logger.debug(`_eql/search ${request.params?.index}`);

      try {
        const promise = context.core.elasticsearch.client.asCurrentUser.eql.search(
          request as EqlSearch,
          options as TransportRequestOptions
        );
        // Temporary workaround until https://github.com/elastic/elasticsearch-js/issues/1297
        if (options?.abortSignal)
          options.abortSignal.addEventListener('abort', () => promise.abort());
        const response = await promise;

        return response;
      } catch (e) {
        logger.debug(`_eql/search error: ${e}`);
        throw e;
      }
    },
  };
};
