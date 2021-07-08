/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { searchService } from '../../../../public/services';
import { ESSQL_SEARCH_STRATEGY } from '../../../../common/lib/constants';
import { EssqlSearchStrategyRequest, EssqlSearchStrategyResponse } from '../../../../types';

import { essql } from '../essql';

export const essqlFn: ReturnType<typeof essql>['fn'] = async (input, args, handlers) => {
  const search = searchService.getService().search;
  const { parameter, ...restOfArgs } = args;
  const req = {
    ...restOfArgs,
    params: parameter,
    filter: input.and,
  };

  try {
    const resp = await search
      .search<EssqlSearchStrategyRequest, EssqlSearchStrategyResponse>(req, {
        strategy: ESSQL_SEARCH_STRATEGY,
      })
      .toPromise();
    return {
      type: 'datatable',
      meta: {
        type: 'essql',
      },
      ...resp,
    };
  } catch (e) {
    let message = `Unexpected error from Elasticsearch: ${e.message}`;
    if (e.err) {
      const { type, reason } = e.err.attributes;
      if (type === 'parsing_exception') {
        message = `Couldn't parse Elasticsearch SQL query. You may need to add double quotes to names containing special characters. Check your query and try again. Error: ${reason}`;
      } else {
        message = `Unexpected error from Elasticsearch: ${type} - ${reason}`;
      }
    }

    // Re-write the error message before surfacing it up
    e.message = message;
    throw e;
  }
};
