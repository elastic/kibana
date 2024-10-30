/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

export const logEsqlRequest = (esqlRequest: {
  query: string;
  filter: QueryDslQueryContainer;
}): string => {
  return `POST _query\n${JSON.stringify(esqlRequest, null, 2)}`;
};
