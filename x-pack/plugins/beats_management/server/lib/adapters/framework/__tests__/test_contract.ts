/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { BackendFrameworkAdapter } from '../adapter_types';

interface ContractConfig {
  before?(): Promise<void>;
  after?(): Promise<void>;
  adapterSetup(): BackendFrameworkAdapter;
}

export const contractTests = (testName: string, config: ContractConfig) => {
  describe.skip(testName, () => {
    // let frameworkAdapter: BackendFrameworkAdapter;
    beforeAll(async () => {
      jest.setTimeout(100000); // 1 second

      if (config.before) {
        await config.before();
      }
    });
    afterAll(async () => config.after && (await config.after()));
    beforeEach(async () => {
      // FIXME: one of these always should exist, type ContractConfig as such
      // const frameworkAdapter = config.adapterSetup();
    });

    it('Should have tests here', () => {
      expect(true).toEqual(true);
    });
  });
};
