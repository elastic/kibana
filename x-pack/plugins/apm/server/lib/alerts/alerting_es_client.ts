/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ApiResponse } from '@elastic/elasticsearch';
import { ThresholdMetActionGroupId } from '../../../common/alert_types';
import {
  ESSearchRequest,
  ESSearchResponse,
} from '../../../../../../typings/elasticsearch';
import {
  AlertInstanceContext,
  AlertInstanceState,
  AlertServices,
} from '../../../../alerting/server';

export function alertingEsClient<TParams extends ESSearchRequest>(
  services: AlertServices<
    AlertInstanceState,
    AlertInstanceContext,
    ThresholdMetActionGroupId
  >,
  params: TParams
): Promise<ApiResponse<ESSearchResponse<unknown, TParams>>> {
  return (services.scopedClusterClient.asCurrentUser.search({
    ...params,
    ignore_unavailable: true,
  }) as unknown) as Promise<ApiResponse<ESSearchResponse<unknown, TParams>>>;
}
