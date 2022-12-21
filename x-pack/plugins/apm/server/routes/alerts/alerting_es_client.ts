/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ESSearchRequest, ESSearchResponse } from '@kbn/es-types';
import { RuleExecutorServices } from '@kbn/alerting-plugin/server';

export type APMEventESSearchRequestParams = ESSearchRequest & {
  body: { size: number; track_total_hits: boolean | number };
};

export async function alertingEsClient<
  TParams extends APMEventESSearchRequestParams
>({
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
