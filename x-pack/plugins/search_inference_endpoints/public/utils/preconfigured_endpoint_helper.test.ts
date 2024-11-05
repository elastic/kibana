/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PRECONFIGURED_ENDPOINTS } from '../components/all_inference_endpoints/constants';
import { isEndpointPreconfigured } from './preconfigured_endpoint_helper';

describe('Preconfigured Endpoint helper', () => {
  it('return true for preconfigured elser', () => {
    expect(isEndpointPreconfigured(PRECONFIGURED_ENDPOINTS.ELSER)).toEqual(true);
  });

  it('return true for preconfigured e5', () => {
    expect(isEndpointPreconfigured(PRECONFIGURED_ENDPOINTS.E5)).toEqual(true);
  });

  it('return false for other endpoints', () => {
    expect(isEndpointPreconfigured('other-endpoints')).toEqual(false);
  });
});
