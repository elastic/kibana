/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SearchRequest } from '@elastic/elasticsearch/lib/api/types';
import { Asset } from '../../common/types_api';
import { esClient } from './es_client';

export async function getAssets(): Promise<Asset[]> {
  const query: SearchRequest = {
    index: 'assets',
  };

  const response = await esClient.search<{}>(query);
  return response.hits.hits.map((hit) => hit._source as Asset);
}
