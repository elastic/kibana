/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { range } from 'lodash';
import type { FtrProviderContext } from '../../../api_integration/ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const log = getService('log');

  describe('ES|QL Tools internal API', () => {
    const createdToolIds: string[] = [];

    const mockTool = {
      id: 'cases-tool',
      type: 'esql',
      description: 'A test tool',
      tags: ['test'],
      configuration: {
        query: 'FROM my_cases | WHERE case_id == ?case_id',
        params: { case_id: { type: 'string', description: 'Case ID' } },
      },
    };

    after(async () => {
      for (const toolId of createdToolIds) {
        try {
          await supertest
            .delete(`/api/agent_builder/tools/${toolId}`)
            .set('kbn-xsrf', 'kibana')
            .expect(200);
        } catch (error) {
          log.warning(`Failed to delete tool ${toolId}: ${error.message}`);
        }
      }
    });

    describe('POST /internal/agent_builder/tools/_bulk_delete', () => {
      before(async () => {
        for (let i = 0; i < 4; i++) {
          const testTool = {
            ...mockTool,
            id: `bulk-delete-test-tool-${i}`,
          };
          const response = await supertest
            .post('/api/agent_builder/tools')
            .set('kbn-xsrf', 'kibana')
            .send(testTool)
            .expect(200);
          createdToolIds.push(response.body.id);
        }
      });

      it('should bulk delete existing tools', async () => {
        const toolIdsToDelete = range(0, 2).map((i) => `bulk-delete-test-tool-${i}`);
        const response = await supertest
          .post('/internal/agent_builder/tools/_bulk_delete')
          .set('kbn-xsrf', 'kibana')
          .set('x-elastic-internal-origin', 'kibana')
          .send({ ids: toolIdsToDelete })
          .expect(200);

        expect(response.body).to.have.property('results');
        expect(response.body.results).to.be.an('array');
        expect(response.body.results).to.have.length(toolIdsToDelete.length);

        for (const result of response.body.results) {
          expect(result.success).to.be(true);
          expect(toolIdsToDelete).to.contain(result.toolId);
        }
      });

      it('should handle a mix of existing and non-existent tools', async () => {
        const toolIdsToDelete = range(2, 4).map((i) => `bulk-delete-test-tool-${i}`);
        const nonExistentToolId = 'this-tool-does-not-exist';
        const ids = [...toolIdsToDelete, nonExistentToolId];

        const response = await supertest
          .post('/internal/agent_builder/tools/_bulk_delete')
          .set('kbn-xsrf', 'kibana')
          .set('x-elastic-internal-origin', 'kibana')
          .send({ ids })
          .expect(200);

        expect(response.body.results).to.have.length(3);

        const successResults = response.body.results.filter((r: any) => r.success);
        const failureResult = response.body.results.find((r: any) => !r.success);

        expect(successResults).to.have.length(2);
        for (const result of successResults) {
          expect(toolIdsToDelete).to.contain(result.toolId);
        }

        expect(failureResult).to.not.be(undefined);
        expect(failureResult.toolId).to.be(nonExistentToolId);
        expect(failureResult.reason.error).to.have.property('message');
        expect(failureResult.reason.error.message).to.contain('not found');
      });

      it('should handle an empty list of IDs', async () => {
        const response = await supertest
          .post('/internal/agent_builder/tools/_bulk_delete')
          .set('kbn-xsrf', 'kibana')
          .set('x-elastic-internal-origin', 'kibana')
          .send({ ids: [] })
          .expect(200);

        expect(response.body).to.have.property('results');
        expect(response.body.results).to.be.an('array');
        expect(response.body.results).to.have.length(0);
      });
    });
  });
}
