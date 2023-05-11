/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IndicesGetResponse } from '@elastic/elasticsearch/lib/api/types';

export function getNonDataStreamIndices(res: IndicesGetResponse) {
  return Object.entries(res)
    .filter(([indexName, { data_stream: dataStream }]) => !dataStream)
    .map(([indexName]) => indexName);
}
