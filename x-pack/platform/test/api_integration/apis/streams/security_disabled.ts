/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { FtrProviderContext } from '../../ftr_provider_context';

const INTERNAL_HEADERS = {
  'kbn-xsrf': 'some-xsrf-token',
  'x-elastic-internal-origin': 'kibana',
  'elastic-api-version': '1',
};

const PUBLIC_HEADERS = {
  'kbn-xsrf': 'some-xsrf-token',
  'x-elastic-internal-origin': 'kibana',
  'elastic-api-version': '2023-10-31',
};

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const es = getService('es');

  describe('streams APIs with security disabled', () => {
    before(async () => {
      // Enable streams
      await supertest.post('/api/streams/_enable').set(PUBLIC_HEADERS).expect(200);

      // Index a document into a classic stream to test classic-specific endpoints
      await es.index({
        index: 'logs-test.security-disabled',
        document: {
          '@timestamp': new Date().toISOString(),
          message: 'test document for security disabled smoke test',
        },
      });

      // Wait for the data stream to be created
      await new Promise((resolve) => setTimeout(resolve, 1000));
    });

    after(async () => {
      // Clean up the classic stream
      try {
        await es.indices.deleteDataStream({ name: 'logs-test.security-disabled' });
      } catch {
        // ignore
      }
    });

    it('GET /api/streams/_status returns status', async () => {
      const { body } = await supertest.get('/api/streams/_status').set(PUBLIC_HEADERS).expect(200);

      expect(body).to.have.property('logs');
      expect(body).to.have.property('can_manage');
    });

    it('GET /api/streams returns list of streams', async () => {
      const { body } = await supertest.get('/api/streams').set(PUBLIC_HEADERS).expect(200);

      expect(body).to.have.property('streams');
      expect(body.streams).to.be.an('array');
      expect(body.streams.length).to.be.greaterThan(0);
    });

    it('GET /api/streams/logs.ecs returns the root stream', async () => {
      const { body } = await supertest.get('/api/streams/logs.ecs').set(PUBLIC_HEADERS).expect(200);

      expect(body).to.have.property('stream');
      expect(body.stream).to.have.property('name', 'logs.ecs');
    });

    it('GET /internal/streams/_classic_status returns can_manage: true', async () => {
      const { body } = await supertest
        .get('/internal/streams/_classic_status')
        .set(INTERNAL_HEADERS)
        .expect(200);

      expect(body).to.eql({ can_manage: true });
    });

    it('GET /internal/streams/{name}/_unmanaged_assets returns assets for classic stream', async () => {
      await supertest
        .get('/internal/streams/logs-test.security-disabled/_unmanaged_assets')
        .set(INTERNAL_HEADERS)
        .expect(200);
    });

    it('GET /internal/streams/{name}/failure_store/stats returns stats', async () => {
      await supertest
        .get('/internal/streams/logs/failure_store/stats')
        .set(INTERNAL_HEADERS)
        .expect(200);
    });

    it('GET /internal/streams/doc_counts/degraded returns doc counts', async () => {
      await supertest
        .get('/internal/streams/doc_counts/degraded')
        .set(INTERNAL_HEADERS)
        .expect(200);
    });
  });
}
