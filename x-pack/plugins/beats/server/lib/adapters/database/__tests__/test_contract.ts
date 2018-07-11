/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { beatsIndexTemplate } from '../../../../utils/index_templates';
import { DatabaseAdapter } from '../adapter_types';

interface ContractConfig {
  before?(): Promise<void>;
  after?(): Promise<void>;
  adapterSetup(): DatabaseAdapter;
}

export const contractTests = (testName: string, config: ContractConfig) => {
  describe(testName, () => {
    let database: DatabaseAdapter;
    beforeAll(async () => {
      jest.setTimeout(100000); // 1 second

      if (config.before) {
        await config.before();
      }
    });
    afterAll(async () => config.after && (await config.after()));
    beforeEach(async () => {
      database = config.adapterSetup();
    });

    it('Should inject template into ES', async () => {
      try {
        await database.putTemplate(
          { kind: 'unauthenticated' },
          {
            name: 'beats-template',
            body: beatsIndexTemplate,
          }
        );
      } catch (e) {
        expect(e).toEqual(null);
      }
    });

    it('Should query ES', async () => {
      const params = {
        id: `beat:foo`,
        ignore: [404],
        index: '.management-beats',
        type: '_doc',
      };
      const response = await database.get({ kind: 'unauthenticated' }, params);

      expect(response).not.toEqual(undefined);
      // @ts-ignore
      expect(response.found).toEqual(undefined);
    });
  });
};
