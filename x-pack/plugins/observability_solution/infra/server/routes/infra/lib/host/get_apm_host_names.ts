/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { estypes } from '@elastic/elasticsearch';
import { GetHostParameters } from '../types';
import { assertQueryStructure } from '../utils';
import { hasSystemIntegrationDocs } from './get_filtered_hosts';

export const getApmHostNames = async ({
  apmDataAccessServices,
  from: start,
  to: end,
  query,
  limit,
}: Pick<GetHostParameters, 'apmDataAccessServices' | 'from' | 'to'> & {
  query: estypes.QueryDslQueryContainer;
  limit?: number;
}) => {
  assertQueryStructure(query);

  const documentSources = await apmDataAccessServices.getDocumentSources({ start, end });
  return apmDataAccessServices.getHostNames({
    documentSources,
    query,
    start,
    end,
    limit,
  });
};

export const maybeGetHostsFromApm = async ({
  infraMetricsClient,
  apmDataAccessServices,
  from,
  to,
  query,
  limit,
}: Pick<GetHostParameters, 'apmDataAccessServices' | 'infraMetricsClient' | 'from' | 'to'> & {
  query: estypes.QueryDslQueryContainer;
  limit?: number;
}) => {
  const hasDocs = await hasSystemIntegrationDocs({
    infraMetricsClient,
    from,
    to,
    query,
  });

  return !hasDocs ? await getApmHostNames({ apmDataAccessServices, from, to, query, limit }) : [];
};
