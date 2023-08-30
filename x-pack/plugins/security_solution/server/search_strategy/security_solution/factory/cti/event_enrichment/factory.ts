/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IEsSearchResponse } from '@kbn/data-plugin/common';
import type { CtiQueries } from '../../../../../../common/search_strategy';
import type { SecuritySolutionFactory } from '../../types';
import { parseOptions } from './parse_options';
import { buildEventEnrichmentQuery } from './query';
import { parseEventEnrichmentResponse } from './response';

export const eventEnrichment: SecuritySolutionFactory<CtiQueries.eventEnrichment> = {
  buildDsl: (maybeOptions: unknown) => {
    const options = parseOptions(maybeOptions);
    return buildEventEnrichmentQuery(options);
  },
  parse: (maybeOptions: unknown, response: IEsSearchResponse, deps: unknown) => {
    const options = parseOptions(maybeOptions);

    return parseEventEnrichmentResponse(options, response);
  },
};
