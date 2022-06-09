/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation, UseMutationOptions, UseMutationResult } from 'react-query';
import { HttpFetchError } from '@kbn/core/public';
import { isolateHost } from '../../../common/lib/endpoint_isolation';
import { HostIsolationRequestBody, HostIsolationResponse } from '../../../../common/endpoint/types';

/**
 * Create host isolation requests
 * @param customOptions
 */
export const useSendIsolateEndpointRequest = (
  customOptions?: UseMutationOptions<
    HostIsolationResponse,
    HttpFetchError,
    HostIsolationRequestBody
  >
): UseMutationResult<HostIsolationResponse, HttpFetchError, HostIsolationRequestBody> => {
  return useMutation<HostIsolationResponse, HttpFetchError, HostIsolationRequestBody>(
    (isolateData: HostIsolationRequestBody) => {
      return isolateHost(isolateData);
    },
    customOptions
  );
};
