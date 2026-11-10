/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isNightshiftSpaceGatedEndpoint, isNightshiftSupportedSpace } from './spaces';

describe('isNightshiftSupportedSpace', () => {
  it('accepts the default space only', () => {
    expect(isNightshiftSupportedSpace('default')).toBe(true);
    expect(isNightshiftSupportedSpace('marketing')).toBe(false);
    expect(isNightshiftSupportedSpace(undefined)).toBe(false);
  });
});

describe('isNightshiftSpaceGatedEndpoint', () => {
  it('gates writes and leaves reads open', () => {
    expect(isNightshiftSpaceGatedEndpoint('POST /internal/nightshift/sources')).toBe(true);
    expect(isNightshiftSpaceGatedEndpoint('PUT /internal/nightshift/sources/{id}')).toBe(true);
    expect(isNightshiftSpaceGatedEndpoint('DELETE /internal/nightshift/sources/{id}')).toBe(true);
    expect(isNightshiftSpaceGatedEndpoint('GET /internal/nightshift/sources')).toBe(false);
  });

  it('leaves an exempt write open, so a space set up earlier can be taken down', () => {
    const exempt = new Set(['POST /internal/nightshift/investigations/service_account/_disable']);

    expect(
      isNightshiftSpaceGatedEndpoint(
        'POST /internal/nightshift/investigations/service_account/_disable',
        exempt
      )
    ).toBe(false);
    expect(
      isNightshiftSpaceGatedEndpoint(
        'POST /internal/nightshift/investigations/service_account/_enable',
        exempt
      )
    ).toBe(true);
  });
});
