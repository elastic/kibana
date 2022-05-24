/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation, UseMutationOptions } from 'react-query';
import { HttpFetchError } from '@kbn/core/public';
import { HostIsolationRequestBody, HostIsolationResponse } from '../../../../common/endpoint/types';
import { unIsolateHost } from '../../../common/lib/endpoint_isolation';

/**
 * Create host release requests
 * @param customOptions
 */
export const useSendReleaseEndpointRequest = (
  customOptions?: UseMutationOptions<
    HostIsolationResponse,
    HttpFetchError,
    HostIsolationRequestBody
  >
) => {
  return useMutation<HostIsolationResponse, HttpFetchError, HostIsolationRequestBody>(
    (releaseData: HostIsolationRequestBody) => {
      return unIsolateHost(releaseData);
    },
    customOptions
  );
};
