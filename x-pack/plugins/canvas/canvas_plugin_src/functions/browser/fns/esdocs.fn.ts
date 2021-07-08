/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// @ts-expect-error untyped local
import { buildESRequest } from '../../../../common/lib/request/build_es_request';

import { searchService } from '../../../../public/services';
import { ESSQL_SEARCH_STRATEGY } from '../../../../common/lib/constants';
import { EssqlSearchStrategyRequest, EssqlSearchStrategyResponse } from '../../../../types';

import { esdocs } from '../esdocs';

export const esdocsFn: ReturnType<typeof esdocs>['fn'] = async (input, args, context) => {
  const { count, index, fields, sort } = args;

  input.and = input.and.concat([
    {
      type: 'filter',
      filterType: 'luceneQueryString',
      query: args.query,
      and: [],
    },
  ]);

  // Load ad-hoc to avoid adding to the page load bundle size
  const squel = await import('safe-squel');

  let query = squel.select({
    autoQuoteTableNames: true,
    autoQuoteFieldNames: true,
    autoQuoteAliasNames: true,
    nameQuoteCharacter: '"',
  });

  if (index) {
    query.from(index);
  }

  if (fields) {
    const allFields = fields.split(',').map((field) => field.trim());
    allFields.forEach((field) => (query = query.field(field)));
  }

  if (sort) {
    const [sortField, sortOrder] = sort.split(',').map((str) => str.trim());
    if (sortField) {
      query.order(`"${sortField}"`, sortOrder === 'asc');
    }
  }

  const search = searchService.getService().search;

  const req = {
    count,
    query: query.toString(),
    filter: input.and,
  };

  // We're requesting the data using the ESSQL strategy because
  // the SQL routes return type information with the result set
  return search
    .search<EssqlSearchStrategyRequest, EssqlSearchStrategyResponse>(req, {
      strategy: ESSQL_SEARCH_STRATEGY,
    })
    .toPromise()
    .then((resp: EssqlSearchStrategyResponse) => {
      return {
        type: 'datatable',
        meta: {
          type: 'essql',
        },
        ...resp,
      };
    });
};
