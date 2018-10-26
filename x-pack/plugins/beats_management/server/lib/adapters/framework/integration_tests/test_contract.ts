/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { BackendFrameworkAdapter } from '../adapter_types';

interface ContractConfig {
  before(timeout: any): Promise<void>;
  after(): Promise<void>;
  adapterSetup(): BackendFrameworkAdapter;
}

export const contractTests = (testName: string, config: ContractConfig) => {
  describe(testName, () => {
    let frameworkAdapter: any;
    beforeAll(async () => {
      await config.before((t: number) => jest.setTimeout(t + 10000000));
    });
    afterAll(async () => await config.after());
    beforeEach(async () => {
      // FIXME: one of these always should exist, type ContractConfig as such
      frameworkAdapter = config.adapterSetup();
    });

    it('Should have tests here', () => {
      expect(frameworkAdapter).toHaveProperty('server');
      expect(frameworkAdapter.server).toHaveProperty('plugins');
      expect(frameworkAdapter.server.plugins).toHaveProperty('security');
    });
  });
};
