/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getStackProductsUsage } from './get_stack_products_usage';

describe('getStackProductsUsage', () => {
  const config: any = {
    ui: {
      max_bucket_size: 10000,
    },
  };
  const clusterUuid = '1abcde2';
  const availableCcs: string[] = [];
  const callCluster = jest.fn().mockImplementation(() => ({
    hits: {
      hits: [],
    },
  }));

  it('should get all stack products', async () => {
    const result = await getStackProductsUsage(config, callCluster, availableCcs, clusterUuid);
    expect(result.elasticsearch).toBeDefined();
    expect(result.kibana).toBeDefined();
    expect(result.logstash).toBeDefined();
    expect(result.beats).toBeDefined();
    expect(result.apm).toBeDefined();
  });
});
