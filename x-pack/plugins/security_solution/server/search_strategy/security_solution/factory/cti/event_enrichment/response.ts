/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CtiQueries } from '../../../../../../common/search_strategy/security_solution/cti';
import { inspectStringifyObject } from '../../../../../utils/build_query';
import type { SecuritySolutionFactory } from '../../types';
import { buildIndicatorEnrichments, getTotalCount } from './helpers';
import { buildEventEnrichmentQuery } from './query';

export const parseEventEnrichmentResponse: SecuritySolutionFactory<CtiQueries.eventEnrichment>['parse'] =
  async (options, response, deps) => {
    const inspect = {
      dsl: [inspectStringifyObject(buildEventEnrichmentQuery(options))],
    };
    const totalCount = getTotalCount(response.rawResponse.hits.total);
    const enrichments = buildIndicatorEnrichments(response.rawResponse.hits.hits);

    return {
      ...response,
      enrichments,
      inspect,
      totalCount,
    };
  };
