/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { setTimeout as setTimeoutAsync } from 'timers/promises';

import type { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const config = getService('config');
  const isBasicLicense = config.get('esTestCluster.license') === 'basic';

  const createKey = async (name: string, type: string, managed: boolean, expiry?: string) => {
    const access =
      type === 'cross_cluster'
        ? {
            search: [
              {
                names: ['*'],
              },
            ],
            replication: [
              {
                names: ['*'],
              },
            ],
          }
        : undefined;
    const metadata = managed ? { managed: true } : {};

    const { body: apiKey } = await supertest
      .post('/internal/security/api_key')
      .set('kbn-xsrf', 'xxx')
      .send({
        name,
        type,
        metadata,
        ...(access ? { access } : {}),
        ...(expiry ? { expiration: expiry } : {}),
      })
      .expect(200);
    expect(apiKey.name).to.eql(name);
    return apiKey;
  };

  const createCrossClusterKeys = async () => {
    // Create 10 'cross_cluster' keys
    return Array.from({ length: 10 }, (_, i) => i).map(
      async (i) => await createKey(`cross_cluster_key_${i}`, 'cross_cluster', false)
    );
  };

  const createExpiredKeys = async () => {
    const restKeys = Array.from({ length: 10 }, (_, i) => i).map(
      async (i) => await createKey(`rest_key_${i}`, 'rest', false)
    );
    const expiredKeys = Array.from({ length: 5 }, (_, i) => i).map(
      async (i) => await createKey(`rest_key_${i}`, 'rest', false, '1s')
    );
    await Promise.all([...restKeys, ...expiredKeys]);
  };

  const createMultipleKeys = async () => {
    const restKeys = Array.from({ length: 5 }, (_, i) => i).map(
      async (i) => await createKey(`rest_key_${i}`, 'rest', false)
    );

    const alertingKeys = Array.from({ length: 5 }, (_, i) => i).map(async (i) => {
      const randomString = Math.random().toString(36).substring(7); // Generate a random string
      return await createKey(`Alerting: ${randomString}`, 'rest', false);
    });

    const metadataManagedKeys = Array.from({ length: 5 }, (_, i) => i).map(async (i) => {
      const randomString = Math.random().toString(36).substring(7); // Generate a random string
      await createKey(`Managed_metadata_${randomString}`, 'rest', true);
    });

    const crossClusterKeys = isBasicLicense ? [] : await createCrossClusterKeys();

    await Promise.all([...crossClusterKeys, ...restKeys, ...alertingKeys, ...metadataManagedKeys]);
  };

  const cleanup = async () => {
    await getService('es').deleteByQuery({
      index: '.security-7',
      body: { query: { match: { doc_type: 'api_key' } } },
      refresh: true,
    });
  };

  describe('Has queryable API Keys', () => {
    beforeEach(cleanup);
    afterEach(cleanup);

    it('should return all the keys', async () => {
      await createMultipleKeys();

      const { body: keys } = await supertest
        .post('/internal/security/api_key/_query')
        .set('kbn-xsrf', 'xxx')
        .send({
          from: 0,
          size: 100,
        })
        .expect(200);
      if (!isBasicLicense) {
        expect(keys.apiKeys.length).to.be(25);
      } else {
        expect(keys.apiKeys.length).to.be(15);
      }
    });

    it('should paginate keys', async () => {
      await createKey('first-api-key', 'rest', false);
      await createKey('second-api-key', 'rest', false);
      const { body: keys } = await supertest
        .post('/internal/security/api_key/_query')
        .set('kbn-xsrf', 'xxx')
        .send({
          from: 0,
          size: 1,
        })
        .expect(200);
      expect(keys.apiKeys.length).to.be(1);
      expect(keys.total).to.be(2);
      expect(keys.apiKeys[0].name).to.be('first-api-key');

      const { body: paginatedKeys } = await supertest
        .post('/internal/security/api_key/_query')
        .set('kbn-xsrf', 'xxx')
        .send({
          from: 1,
          size: 1,
        })
        .expect(200);
      expect(keys.apiKeys.length).to.be(1);
      expect(keys.total).to.be(2);
      expect(paginatedKeys.apiKeys[0].name).to.be('second-api-key');
    });

    it('should return the correct aggregations', async () => {
      await createMultipleKeys();

      const { body: aggregationResponse } = await supertest
        .post('/internal/security/api_key/_query')
        .set('kbn-xsrf', 'xxx')
        .send({
          query: { match: { invalidated: false } },
        })
        .expect(200);

      expect(aggregationResponse.aggregations).to.have.property('usernames');
      expect(aggregationResponse.aggregations.usernames.buckets.length).to.be(1);

      expect(aggregationResponse.aggregations).to.have.property('managed');
      expect(aggregationResponse.aggregations.managed.buckets.metadataBased.doc_count).to.eql(5);

      if (!isBasicLicense) {
        expect(aggregationResponse.total).to.be(25);
        expect(aggregationResponse.aggregations).to.have.property('types');
        expect(aggregationResponse.aggregations.types.buckets.length).to.be(2);
      } else {
        expect(aggregationResponse.total).to.be(15);

        expect(aggregationResponse.aggregations).to.have.property('types');
        expect(aggregationResponse.aggregations.types.buckets.length).to.be(1);
      }
    });

    it('should query API keys with custom queries', async () => {
      await createMultipleKeys();

      const { body: keys } = await supertest
        .post('/internal/security/api_key/_query')
        .set('kbn-xsrf', 'xxx')
        .send({
          query: {
            bool: {
              filter: [
                {
                  term: {
                    type: 'rest',
                  },
                },
              ],
            },
          },
        })
        .expect(200);

      expect(keys.apiKeys.length).to.be(10);
      keys.apiKeys.forEach((key: any) => {
        expect(key.type).to.be('rest');
      });
    });

    it('should query API keys with filters', async () => {
      await createMultipleKeys();

      const { body: restKeys } = await supertest
        .post('/internal/security/api_key/_query')
        .set('kbn-xsrf', 'xxx')
        .send({
          query: {
            match_all: {},
          },
          filters: {
            type: 'rest',
          },
        })
        .expect(200);

      expect(restKeys.apiKeys.length).to.be(5);
      restKeys.apiKeys.forEach((key: any) => {
        expect(key.type).to.be('rest');
      });

      const { body: managedKeys } = await supertest
        .post('/internal/security/api_key/_query')
        .set('kbn-xsrf', 'xxx')
        .send({
          query: {
            match_all: {},
          },
          filters: {
            type: 'managed',
          },
        })
        .expect(200);

      expect(managedKeys.apiKeys.length).to.be(10);
      const alertingNameKeys = managedKeys.apiKeys.filter((key: any) =>
        key.name.startsWith('Alerting:')
      );

      expect(alertingNameKeys.length).to.be(5);
    });

    it('should correctly filter active and expired keys', async () => {
      await createExpiredKeys();

      const { body: activeKeys } = await supertest
        .post('/internal/security/api_key/_query')
        .set('kbn-xsrf', 'xxx')
        .send({
          query: {
            match_all: {},
          },
          filters: {
            expired: false,
          },
        })
        .expect(200);

      expect(activeKeys.apiKeys.length).to.be(10);

      await setTimeoutAsync(2500);

      const { body: expiredKeys } = await supertest
        .post('/internal/security/api_key/_query')
        .set('kbn-xsrf', 'xxx')
        .send({
          query: {
            match_all: {},
          },
          filters: {
            expired: true,
          },
        })
        .expect(200);
      expect(expiredKeys.apiKeys.length).to.be(5);
    });

    it('should correctly filter keys with combined filters', async () => {
      await createExpiredKeys();
      await setTimeoutAsync(2500);

      const { body: expiredRestKeys } = await supertest
        .post('/internal/security/api_key/_query')
        .set('kbn-xsrf', 'xxx')
        .send({
          query: {
            match_all: {},
          },
          filters: {
            type: 'rest',
            expired: true,
          },
        })
        .expect(200);

      expect(expiredRestKeys.apiKeys.length).to.be(5);
    });
  });
}
