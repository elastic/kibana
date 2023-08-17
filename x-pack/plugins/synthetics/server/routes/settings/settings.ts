/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { CatIndicesResponse } from '@elastic/elasticsearch/lib/api/types';
import { SyntheticsRestApiRouteFactory } from '../types';
import { SYNTHETICS_API_URLS } from '../../../common/constants';

export const getIndexSizesRoute: SyntheticsRestApiRouteFactory<{
  data: CatIndicesResponse;
}> = () => ({
  method: 'GET',
  path: SYNTHETICS_API_URLS.INDEX_SIZE,
  validate: {},
  handler: async ({ uptimeEsClient, server }) => {
    const data = await uptimeEsClient.baseESClient.cat.indices({
      index: 'synthetics-*',
      format: 'json',
      bytes: 'b',
    });

    return { data };
  },
});
