/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CtiQueries } from '../../../../../../common/search_strategy/security_solution/cti';
import type { SecuritySolutionFactory } from '../../types';
import { buildEventEnrichmentQuery } from './query';
import { parseEventEnrichmentResponse } from './response';

export const eventEnrichment: SecuritySolutionFactory<CtiQueries.eventEnrichment> = {
  buildDsl: buildEventEnrichmentQuery,
  parse: parseEventEnrichmentResponse,
};
