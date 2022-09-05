/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HostMetadata } from '../../../../common/endpoint/types';

/**
 * Given an endpoint host metadata record (`HostMetadata`), this utility will validate if
 * that host is isolated
 * @param endpointMetadata
 */
export const isEndpointHostIsolated = (endpointMetadata: HostMetadata): boolean => {
  return Boolean(endpointMetadata.Endpoint.state?.isolation);
};
