/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty } from 'lodash';
import { CtiQueries } from '../../../../../../common/search_strategy/security_solution/cti';
import { createQueryFilterClauses } from '../../../../../utils/build_query';
import { SecuritySolutionFactory } from '../../types';
import { buildIndicatorShouldClauses } from './helpers';

export const buildEventEnrichmentQuery: SecuritySolutionFactory<CtiQueries.eventEnrichment>['buildDsl'] =
  ({ defaultIndex, docValueFields, eventFields, filterQuery, timerange: { from, to } }) => {
    const filter = [
      ...createQueryFilterClauses(filterQuery),
      { term: { 'event.type': 'indicator' } },
      {
        range: {
          '@timestamp': {
            gte: from,
            lte: to,
            format: 'strict_date_optional_time',
          },
        },
      },
    ];

    return {
      allow_no_indices: true,
      ignore_unavailable: true,
      index: defaultIndex,
      body: {
        _source: false,
        ...(!isEmpty(docValueFields) && { docvalue_fields: docValueFields }),
        fields: ['*'],
        query: {
          bool: {
            should: buildIndicatorShouldClauses(eventFields),
            filter,
            minimum_should_match: 1,
          },
        },
      },
    };
  };
