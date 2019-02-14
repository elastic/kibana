/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { internalUser } from '../../framework/adapter_types';
import { ElasticsearchBeatsAdapter } from '../elasticsearch_beats_adapter';

interface ContractConfig {
  before(): Promise<void>;
  after(): Promise<void>;
  adapterSetup(): Promise<ElasticsearchBeatsAdapter>;
}

export const contractTests = (testName: string, config: ContractConfig) => {
  describe(testName, () => {
    let adapter: ElasticsearchBeatsAdapter;
    beforeAll(config.before);
    afterAll(config.after);
    beforeEach(async () => {
      adapter = await config.adapterSetup();
    });

    it('Should insert beat', async () => {
      const result = adapter.upsert(internalUser, {
        id: 'something',
        type: 'filebeat',
        access_token: '3helu3huh34klh5k3l4uh',
        enrollment_token: 'wekruhw4lglu',
        active: true,
        host_ip: '192.168.1.1',
        host_name: 'localhost',
        tags: [],
        last_updated: 1550025030,
      });
      expect(result).toMatchSnapshot('insert-beat');
    });

    it('Should re-insert beat without error, should update it', async () => {
      let result: any = await adapter.upsert(internalUser, {
        id: 'something',
        type: 'filebeat',
        access_token: '3helu3huh34klh5k3l4uh',
        enrollment_token: 'wekruhw4lglu',
        active: true,
        host_ip: '192.168.1.1',
        host_name: 'localhost',
        tags: [],
        last_updated: 1550025030,
      });
      expect(result).toMatchSnapshot('insert-beat');

      result = await adapter.upsert(internalUser, {
        id: 'something',
        type: 'filebeat',
        access_token: '3helu3huh34klh5k3l4uh',
        enrollment_token: 'wekruhw4lglu',
        active: true,
        host_ip: '192.168.1.1',
        host_name: 'localhost2',
        tags: [],
        last_updated: 1550025030,
      });
      expect(result).toMatchSnapshot('insert-beat');

      result = await adapter.getAll(internalUser);
      expect(result.length).toEqual(1);
      expect(result[0].host_name).toEqual('localhost2');

      expect(result).toMatchSnapshot('list-beats');
    });

    it('Should get beat', async () => {
      await adapter.upsert(internalUser, {
        id: 'something',
        type: 'filebeat',
        access_token: '3helu3huh34klh5k3l4uh',
        enrollment_token: 'wekruhw4lglu',
        active: true,
        host_ip: '192.168.1.1',
        host_name: 'localhost',
        tags: [],
        last_updated: 1550025030,
      });
      const result = await adapter.get(internalUser, 'something');
      expect(result).toMatchSnapshot('get-beat');
    });
  });
};
