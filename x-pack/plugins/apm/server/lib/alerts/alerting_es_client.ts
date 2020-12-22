/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ThresholdMetActionGroupId } from '../../../common/alert_types';
import {
  ESSearchRequest,
  ESSearchResponse,
} from '../../../../../typings/elasticsearch';
import {
  AlertInstanceContext,
  AlertInstanceState,
  AlertServices,
} from '../../../../alerts/server';

export function alertingEsClient<TParams extends ESSearchRequest>(
  services: AlertServices<
    AlertInstanceState,
    AlertInstanceContext,
    ThresholdMetActionGroupId
  >,
  params: TParams
): Promise<ESSearchResponse<unknown, TParams>> {
  return services.callCluster('search', {
    ...params,
    ignore_unavailable: true,
  });
}
