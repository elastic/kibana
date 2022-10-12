/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ENDPOINT_CAPABILITIES } from '../../../../common/endpoint/service/response_actions/constants';
import type { HostMetadata, MaybeImmutable } from '../../../../common/endpoint/types';

export const useDoesEndpointSupportResponder = (
  endpointMetadata: MaybeImmutable<HostMetadata> | undefined
): boolean => {
  if (endpointMetadata) {
    return ENDPOINT_CAPABILITIES.every((capability) =>
      endpointMetadata?.Endpoint.capabilities?.includes(capability)
    );
  }
  return false;
};
