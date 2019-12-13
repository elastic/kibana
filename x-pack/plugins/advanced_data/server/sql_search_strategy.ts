/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { TSearchStrategyProvider } from '../../../../src/plugins/data/server';
import { SQL_SEARCH_STRATEGY } from '../common';

export const sqlSearchStrategyProvider: TSearchStrategyProvider<typeof SQL_SEARCH_STRATEGY> = (
  context,
  caller
) => {
  return {
    search: async request => {
      //   console.log('in sqlSearchStrategyProvider.search with ', JSON.stringify(request));
      try {
        const results = await caller('transport.request', {
          path: '/_sql?format=json',
          method: 'POST',
          body: {
            query: request.sql,
            client_id: 'sqlsearchstrategy',
          },
        });

        return { results };
      } catch (e) {
        return { error: e };
      }
    },
  };
};
