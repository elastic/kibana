/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EqlQueryTypes } from '../../../../../common/search_strategy/eql';
import { EqlQueryFactory } from '../types';

export const eqlValidationQuery: EqlQueryFactory<EqlQueryTypes.validation> = {
  buildDsl: (request) => ({
    allow_no_indices: true,
    index: request.index.join(),
    body: {
      query: request.query,
    },
  }),
  parse: async (request, response) => {
    debugger;
    return {};
  },
};
