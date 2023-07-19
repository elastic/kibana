/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Query } from '@kbn/es-query';
import { buildEsQuery } from '@kbn/es-query';
import { isEmpty } from 'lodash';

export const getQueryFilter = (...filters: string[]) => {
  const joined = filters.filter((filter) => !isEmpty(filter)).join(' AND ');

  const kqlQuery: Query = {
    language: 'kuery',
    query: joined,
  };

  return buildEsQuery(undefined, kqlQuery, []);
};
