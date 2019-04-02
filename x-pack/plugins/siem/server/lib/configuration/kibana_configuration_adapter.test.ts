/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { KibanaConfigurationAdapter } from './kibana_configuration_adapter';

describe('the KibanaConfigurationAdapter', () => {
  test('queries the xpack.siem configuration of the server', async () => {
    const mockConfig = {
      get: jest.fn(),
    };

    const configurationAdapter = new KibanaConfigurationAdapter({
      config: () => mockConfig,
    });

    await configurationAdapter.get();

    expect(mockConfig.get).toBeCalledWith('xpack.siem');
  });

  test('applies the query defaults', async () => {
    const configurationAdapter = new KibanaConfigurationAdapter({
      config: () => ({
        get: () => ({}),
      }),
    });

    const configuration = await configurationAdapter.get();

    expect(configuration).toMatchObject({
      query: {
        partitionSize: expect.any(Number),
        partitionFactor: expect.any(Number),
      },
    });
  });
});
