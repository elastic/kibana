/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getAllowedOutputTypeForPolicy } from './output_helpers';

describe('getAllowedOutputTypeForPolicy', () => {
  it('should return all available output type for an agent policy without APM and Fleet Server', () => {
    const res = getAllowedOutputTypeForPolicy({
      package_policies: [
        {
          package: { name: 'nginx' },
        },
      ],
    } as any);

    expect(res).toContain('elasticsearch');
    expect(res).toContain('logstash');
  });

  it('should return only elasticsearch for an agent policy with APM', () => {
    const res = getAllowedOutputTypeForPolicy({
      package_policies: [
        {
          package: { name: 'apm' },
        },
      ],
    } as any);

    expect(res).toEqual(['elasticsearch']);
  });

  it('should return only elasticsearch for an agent policy with Fleet Server', () => {
    const res = getAllowedOutputTypeForPolicy({
      package_policies: [
        {
          package: { name: 'fleet_server' },
        },
      ],
    } as any);

    expect(res).toEqual(['elasticsearch']);
  });
});
