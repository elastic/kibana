/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { apiService } from './utils';
import { FetchNetworkEventsParams } from '../actions/network_events';
import {
  SyntheticsNetworkEventsApiResponse,
  SyntheticsNetworkEventsApiResponseType,
} from '../../../common/runtime_types';

export async function fetchNetworkEvents(
  params: FetchNetworkEventsParams
): Promise<SyntheticsNetworkEventsApiResponse> {
  return (await apiService.get(
    `/api/uptime/network_events`,
    {
      checkGroup: params.checkGroup,
      stepIndex: params.stepIndex,
    },
    SyntheticsNetworkEventsApiResponseType
  )) as SyntheticsNetworkEventsApiResponse;
}
