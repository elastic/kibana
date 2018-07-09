/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import expect from 'expect.js';
import { beatsIndexTemplate } from '../../../../utils/index_templates';
import { DatabaseAdapter } from '../adapter_types';

interface ContractConfig {
  adapter?: DatabaseAdapter;
  before?(): Promise<void>;
  after?(): Promise<void>;
  adapterSetup?(): DatabaseAdapter;
}

export const contractTests = (testName: string, config: ContractConfig) => {
  describe(testName, () => {
    let frameworkAdapter: DatabaseAdapter;
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
        : config.adapter) as DatabaseAdapter;
    });

    it('Should inject template into ES', async () => {
      try {
        await frameworkAdapter.putTemplate(null, {
          id: 'beats-template',
          body: beatsIndexTemplate,
        });
      } catch (e) {
        expect(e).to.eql(null);
      }
    });

    it('Should query ES', async () => {
      const params = {
        id: `beat:foo`,
        ignore: [404],
        index: '.management-beats',
        type: '_doc',
      };
      const response = await frameworkAdapter.get(null, params);

      expect(response).to.not.eql(undefined);
      // @ts-ignore
      expect(response.found).to.eql(undefined);
    });
  });
};
