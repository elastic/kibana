/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { smlElasticsearchIndexMappings, smlIndexName } from '@kbn/agent-builder-plugin/server';
import type { FtrProviderContext } from '../../api_integration/ftr_provider_context';

const API_VERSION = '2023-10-31';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const es = getService('es');
  const kibanaServer = getService('kibanaServer');

  describe('SML Records CRUD API', function () {
    this.tags(['skipServerless']);

    const recordId = 'index::sml-ftr-crud::0';
    const recordBody = {
      type: 'index',
      title: 'sml-ftr-crud',
      origin_id: 'sml-ftr-crud',
      content: 'SML FTR CRUD test record.',
      spaces: ['*'],
      tags: ['ftr'],
      params: { index_pattern: 'sml-ftr-crud*' },
    };

    before(async () => {
      const exists = await es.indices.exists({ index: smlIndexName });
      if (!exists) {
        await es.indices.create({
          index: smlIndexName,
          mappings: smlElasticsearchIndexMappings,
        });
      }
    });

    after(async () => {
      try {
        await es.delete({ index: smlIndexName, id: recordId, refresh: true });
      } catch {
        // ignore cleanup failures
      }
    });

    describe('with experimentalFeatures enabled', () => {
      describe('PUT /api/agent_builder/sml/{id}', () => {
        it('should create an SML record', async () => {
          const response = await supertest
            .put(`/api/agent_builder/sml/${encodeURIComponent(recordId)}`)
            .set('kbn-xsrf', 'kibana')
            .set('elastic-api-version', API_VERSION)
            .send(recordBody)
            .expect(200);

          expect(response.body).to.have.property('id', recordId);
          expect(response.body).to.have.property('type', recordBody.type);
          expect(response.body).to.have.property('title', recordBody.title);
          expect(response.body).to.have.property('origin_id', recordBody.origin_id);
          expect(response.body).to.have.property('content', recordBody.content);
          expect(response.body).to.have.property('user_defined', true);
        });

        it('should update an existing SML record', async () => {
          const updatedBody = { ...recordBody, content: 'Updated content.' };
          const response = await supertest
            .put(`/api/agent_builder/sml/${encodeURIComponent(recordId)}`)
            .set('kbn-xsrf', 'kibana')
            .set('elastic-api-version', API_VERSION)
            .send(updatedBody)
            .expect(200);

          expect(response.body).to.have.property('content', 'Updated content.');
        });
      });

      describe('GET /api/agent_builder/sml/{id}', () => {
        it('should retrieve an SML record by ID', async () => {
          const response = await supertest
            .get(`/api/agent_builder/sml/${encodeURIComponent(recordId)}`)
            .set('elastic-api-version', API_VERSION)
            .expect(200);

          expect(response.body).to.have.property('id', recordId);
          expect(response.body).to.have.property('type', recordBody.type);
          expect(response.body).to.have.property('title', recordBody.title);
        });
      });

      describe('DELETE /api/agent_builder/sml/{id}', () => {
        it('should delete an SML record', async () => {
          const response = await supertest
            .delete(`/api/agent_builder/sml/${encodeURIComponent(recordId)}`)
            .set('kbn-xsrf', 'kibana')
            .set('elastic-api-version', API_VERSION)
            .expect(200);

          expect(response.body).to.have.property('success', true);
        });

        it('should return 404 when getting a deleted record', async () => {
          await supertest
            .get(`/api/agent_builder/sml/${encodeURIComponent(recordId)}`)
            .set('elastic-api-version', API_VERSION)
            .expect(404);
        });
      });
    });

    describe('with experimentalFeatures disabled', () => {
      before(async () => {
        await kibanaServer.uiSettings.update({
          'agentBuilder:experimentalFeatures': false,
        });
      });

      after(async () => {
        await kibanaServer.uiSettings.update({
          'agentBuilder:experimentalFeatures': true,
        });
      });

      it('PUT should return 404', async () => {
        await supertest
          .put(`/api/agent_builder/sml/${encodeURIComponent(recordId)}`)
          .set('kbn-xsrf', 'kibana')
          .set('elastic-api-version', API_VERSION)
          .send(recordBody)
          .expect(404);
      });

      it('GET should return 404', async () => {
        await supertest
          .get(`/api/agent_builder/sml/${encodeURIComponent(recordId)}`)
          .set('elastic-api-version', API_VERSION)
          .expect(404);
      });

      it('DELETE should return 404', async () => {
        await supertest
          .delete(`/api/agent_builder/sml/${encodeURIComponent(recordId)}`)
          .set('kbn-xsrf', 'kibana')
          .set('elastic-api-version', API_VERSION)
          .expect(404);
      });
    });
  });
}
