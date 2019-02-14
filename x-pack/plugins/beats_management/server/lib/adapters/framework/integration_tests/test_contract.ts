/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { BackendFrameworkAdapter } from '../adapter_types';

interface ContractConfig {
  before(): Promise<void>;
  after(): Promise<void>;
  adapterSetup(): BackendFrameworkAdapter;
}

export const contractTests = (testName: string, config: ContractConfig) => {
  describe(testName, () => {
    let frameworkAdapter: any;
    beforeAll(config.before);
    afterAll(config.after);
    beforeEach(async () => {
      frameworkAdapter = config.adapterSetup();
    });

    it('Should have tests here', () => {
      expect(frameworkAdapter).toHaveProperty('server');
      expect(frameworkAdapter.server).toHaveProperty('plugins');
      expect(frameworkAdapter.server.plugins).toHaveProperty('security');
    });
  });
};
