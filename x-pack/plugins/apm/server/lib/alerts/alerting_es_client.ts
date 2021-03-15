/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ESSearchRequest,
  ESSearchResponse,
} from '../../../../../typings/elasticsearch';
import { AlertServices } from '../../../../alerting/server';

export function alertingEsClient<TParams extends ESSearchRequest>(
  callCluster: AlertServices<never, never, never>['callCluster'],
  params: TParams
): Promise<ESSearchResponse<unknown, TParams>> {
  return callCluster('search', {
    ...params,
    ignore_unavailable: true,
  });
}
