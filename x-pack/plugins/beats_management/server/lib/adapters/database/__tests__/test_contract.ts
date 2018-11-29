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
  describe.skip(testName, () => {
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
          { kind: 'internal' },
          {
            name: '.management-beats',
            body: beatsIndexTemplate,
          }
        );
      } catch (e) {
        expect(e).toEqual(null);
      }
    });

    it('Unauthorized users cant query', async () => {
      const params = {
        id: `beat:foo`,
        ignore: [404],
        index: '.management-beats',
        type: '_doc',
      };
      let ranWithoutError = false;
      try {
        await database.get({ kind: 'unauthenticated' }, params);
        ranWithoutError = true;
      } catch (e) {
        expect(e).not.toEqual(null);
      }
      expect(ranWithoutError).toEqual(false);
    });

    it('Should query ES', async () => {
      const params = {
        id: `beat:foo`,
        ignore: [404],
        index: '.management-beats',
        type: '_doc',
      };
      const response = await database.get({ kind: 'internal' }, params);

      expect(response).not.toEqual(undefined);
      // @ts-ignore
      expect(response.found).toEqual(undefined);
    });
  });
};
