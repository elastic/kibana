/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EpmPackageResponse } from './api';
import { getIntegrationNameFromResponse } from './api_parsers';

describe('getIntegrationNameFromResponse', () => {
  it.each([
    ['audit-security.data-stream-1.0.0', 'security-1.0.0'],
    ['audit-endpoint_security.data_stream-1.0.0', 'endpoint_security-1.0.0'],
    ['audit-endpoint_security_2.data_stream-1.0.0', 'endpoint_security_2-1.0.0'],
  ])(
    'should return the integration name from the ingest pipeline name %s',
    (ingestPipelineName, expected) => {
      const response = { response: [{ id: ingestPipelineName }] } as EpmPackageResponse;
      expect(getIntegrationNameFromResponse(response)).toEqual(expected);
    }
  );
  it('should return an empty string if the response is empty', () => {
    const response = { response: [] } as unknown as EpmPackageResponse;
    expect(getIntegrationNameFromResponse(response)).toEqual('');
  });
  it('should return an empty string if the response is undefined', () => {
    const response = {} as EpmPackageResponse;
    expect(getIntegrationNameFromResponse(response)).toEqual('');
  });
  it('should return an empty string if the response is null', () => {
    const response = { response: null } as unknown as EpmPackageResponse;
    expect(getIntegrationNameFromResponse(response)).toEqual('');
  });
});
