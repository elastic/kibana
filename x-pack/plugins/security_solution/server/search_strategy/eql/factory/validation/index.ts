/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SearchResponse } from 'elasticsearch';
import { IEsSearchRequest, ISearchOptions } from '../../../../../../../../src/plugins/data/common';

import { EqlQueryTypes } from '../../../../../common/search_strategy/eql';
import { EqlQueryFactory } from '../types';
import { getValidationErrors, isValidationErrorResponse } from './helpers';

export const eqlValidationQuery: EqlQueryFactory<EqlQueryTypes.validation> = {
  buildRequest: (request) =>
    ({
      allow_no_indices: true,
      index: request.index.join(),
      body: {
        query: request.query,
      },
    } as IEsSearchRequest),
  buildOptions: (request) =>
    ({
      ignore: [400],
    } as ISearchOptions),
  parse: async (request, response) => {
    const errors = isValidationErrorResponse(response) ? getValidationErrors(response) : [];

    return {
      rawResponse: response.body as SearchResponse<unknown>,
      errors,
      valid: errors.length === 0,
    };
  },
};
