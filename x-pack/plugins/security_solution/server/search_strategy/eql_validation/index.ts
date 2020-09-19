/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EqlSearch } from '@elastic/elasticsearch/api/requestParams';

import { Logger } from 'kibana/server';
import {
  IEsSearchRequest,
  IEsSearchResponse,
  ISearchStrategy,
} from '../../../../../../src/plugins/data/server';
import { getValidationErrors, isValidationError } from './helpers';

export const EQL_VALIDATION_SEARCH_STRATEGY = 'eql_validation';

interface EqlValidationRequest extends IEsSearchRequest {
  index: string[];
  query: string;
}

interface EqlValidationResponse extends IEsSearchResponse {
  valid: boolean;
  errors: string[];
}

export const eqlValidationSearchStrategyProvider = (
  logger: Logger
): ISearchStrategy<EqlValidationRequest, EqlValidationResponse> => {
  return {
    search: async (context, request, options) => {
      logger.debug(`_eql/validation ${request.index}`);

      try {
        const params: EqlSearch = { index: request.index.join(), body: { query: request.query } };
        // Temporary workaround until https://github.com/elastic/elasticsearch-js/issues/1297
        const promise = context.core.elasticsearch.client.asCurrentUser.eql.search(params);
        if (options?.abortSignal)
          options.abortSignal.addEventListener('abort', () => promise.abort());
        await promise;

        return { valid: true, errors: [] };
      } catch (error) {
        if (isValidationError(error)) {
          return { valid: false, errors: getValidationErrors(error) };
        }
        throw error;
      }
    },
  };
};
