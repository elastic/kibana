/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ESSearchRequest,
  ESSearchResponse,
} from '@kbn/core/types/elasticsearch';
import { RuleExecutorServices } from '@kbn/alerting-plugin/server';

export async function alertingEsClient<TParams extends ESSearchRequest>({
  scopedClusterClient,
  params,
}: {
  scopedClusterClient: RuleExecutorServices<
    never,
    never,
    never
  >['scopedClusterClient'];
  params: TParams;
}): Promise<ESSearchResponse<unknown, TParams>> {
  const response = await scopedClusterClient.asCurrentUser.search({
    ...params,
    ignore_unavailable: true,
  });

  return response as unknown as ESSearchResponse<unknown, TParams>;
}
