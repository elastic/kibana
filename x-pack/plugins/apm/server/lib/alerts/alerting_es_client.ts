/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from '@kbn/logging';
import {
  ESSearchRequest,
  ESSearchResponse,
} from '../../../../../../typings/elasticsearch';
import { AlertServices } from '../../../../alerting/server';

export async function alertingEsClient<TParams extends ESSearchRequest>({
  scopedClusterClient,
  logger,
  params,
}: {
  scopedClusterClient: AlertServices<
    never,
    never,
    never
  >['scopedClusterClient'];
  logger: Logger;
  params: TParams;
}): Promise<ESSearchResponse<unknown, TParams>> {
  // logger.debug(JSON.stringify(params, null, 2));

  const response = await scopedClusterClient.asCurrentUser.search({
    ...params,
    ignore_unavailable: true,
  });

  // logger.debug(JSON.stringify(response.body, null, 2));

  return (response.body as unknown) as ESSearchResponse<unknown, TParams>;
}
