/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import expect from 'expect.js';
import { beatsIndexTemplate } from '../../../../utils/index_templates';
import { BackendFrameworkAdapter } from '../../../lib';

interface ContractConfig {
  adapter?: BackendFrameworkAdapter;
  before?(): Promise<void>;
  after?(): Promise<void>;
  adapterSetup?(): BackendFrameworkAdapter;
}

export const contractTests = (testName: string, config: ContractConfig) => {
  describe(testName, () => {
    let frameworkAdapter: BackendFrameworkAdapter;
    beforeAll(async () => {
      jest.setTimeout(100000); // 1 second

      if (config.before) {
        await config.before();
      }
    });
    afterAll(async () => config.after && (await config.after()));
    beforeEach(async () => {
      // FIXME: one of these always should exist, type ContractConfig as such
      frameworkAdapter = (config.adapterSetup
        ? config.adapterSetup()
        : config.adapter) as BackendFrameworkAdapter;
    });

    it('Should inject template into ES', async () => {
      try {
        await frameworkAdapter.installIndexTemplate(
          'beats-template',
          beatsIndexTemplate
        );
      } catch (e) {
        expect(e).to.eql(null);
      }
    });
  });
};
