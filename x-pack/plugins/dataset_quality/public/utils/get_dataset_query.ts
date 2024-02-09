/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Query } from '@kbn/es-query';

export function getDatasetQuery(query: Query['query']) {
  if (typeof query === 'string') {
    return query;
  }

  console.log(query);

  return `${query.data_stream?.dataset}-${query.data_stream?.namespace}`;
}
