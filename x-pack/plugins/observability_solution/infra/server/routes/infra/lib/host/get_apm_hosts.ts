/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { estypes } from '@elastic/elasticsearch';
import { GetHostParameters } from '../types';

export const getApmHostNames = async ({
  apmDataAccessServices,
  from: start,
  to: end,
  query,
  limit,
}: Required<Pick<GetHostParameters, 'apmDataAccessServices' | 'from' | 'to'>> & {
  query?: estypes.QueryDslQueryContainer;
  limit?: number;
}) => {
  const documentSources = await apmDataAccessServices.getDocumentSources({ start, end });
  return apmDataAccessServices.getHostNames({
    documentSources,
    query,
    start,
    end,
    size: limit,
  });
};
