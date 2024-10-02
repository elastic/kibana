/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parseServiceParams } from './parse_service_params';

describe('parseServiceParams', () => {
  it('should return only serviceName with a simple name string', () => {
    const params = parseServiceParams('service.name');

    expect(params).toEqual({ serviceName: 'service.name' });
  });

  it('should return both serviceName and environment with a full name string', () => {
    const params = parseServiceParams('service.name:service.environment');

    expect(params).toEqual({ serviceName: 'service.name', environment: 'service.environment' });
  });

  it('should ignore multiple colons in the environment portion of the displayName', () => {
    const params = parseServiceParams('service.name:synthtrace: service.environment');

    expect(params).toEqual({
      serviceName: 'service.name',
      environment: 'synthtrace: service.environment',
    });
  });

  it('should ignore empty environment names and return only the service.name', () => {
    const params = parseServiceParams('service.name:');

    expect(params).toEqual({
      serviceName: 'service.name',
    });
  });
});
