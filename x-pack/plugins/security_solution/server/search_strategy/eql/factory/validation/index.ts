/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EqlQueryTypes } from '../../../../../common/search_strategy/eql';
import { EqlQueryFactory } from '../types';
import { getValidationErrors, isValidationErrorResponse } from './helpers';

export const eqlValidationQuery: EqlQueryFactory<EqlQueryTypes.validation> = {
  buildRequest: (request) => ({
    params: {
      allow_no_indices: true,
      index: request.params.index.join(),
      body: {
        query: request.params.query,
      },
    },
  }),
  buildOptions: (request) => ({
    ignore: [400],
  }),
  parse: async (request, response) => {
    const errors = isValidationErrorResponse(response) ? getValidationErrors(response) : [];

    return {
      rawResponse: response.rawEqlResponse,
      errors,
      valid: errors.length === 0,
    };
  },
};
