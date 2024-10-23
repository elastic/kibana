/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { estypes } from '@elastic/elasticsearch';
import type { TimeRangeMetadata } from '@kbn/apm-data-access-plugin/common';
import { GetHostParameters } from '../types';

export const getApmHostNames = async ({
  apmDataAccessServices,
  apmDocumentSources,
  from: start,
  to: end,
  query,
  limit,
}: Required<Pick<GetHostParameters, 'apmDataAccessServices' | 'from' | 'to'>> & {
  query?: estypes.QueryDslQueryContainer;
  limit?: number;
  apmDocumentSources: TimeRangeMetadata['sources'];
}) => {
  return apmDataAccessServices.getHostNames({
    documentSources: apmDocumentSources,
    query,
    start,
    end,
    size: limit,
  });
};
