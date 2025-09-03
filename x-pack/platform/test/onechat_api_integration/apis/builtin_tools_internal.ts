/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { builtinToolIds } from '@kbn/onechat-common';
import type { FtrProviderContext } from '../../api_integration/ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');

  describe('Builtin Tools internal API', () => {
    describe('POST /internal/chat/tools/_bulk_delete', () => {
      it('should return error results when attempting to bulk delete builtin system tools', async () => {
        const toolIds = Object.values(builtinToolIds).slice(0, 3) as string[];

        const response = await supertest
          .post('/internal/chat/tools/_bulk_delete')
          .set('kbn-xsrf', 'kibana')
          .send({ ids: toolIds })
          .expect(200);

        expect(response.body).to.have.property('results');
        expect(response.body.results).to.be.an('array');
        expect(response.body.results).to.have.length(3);

        for (let i = 0; i < toolIds.length; i++) {
          const result = response.body.results[i];
          expect(result).to.have.property('toolId', toolIds[i]);
          expect(result).to.have.property('success', false);
          expect(result).to.have.property('reason');
          expect(result.reason).to.have.property('error');
          expect(result.reason.error).to.have.property('message');
          expect(result.reason.error.message).to.contain("is read-only and can't be deleted");
        }
      });

      it('should handle mixed bulk delete with builtin and custom tools', async () => {
        const customTool = {
          id: 'test-custom-tool',
          type: 'esql',
          description: 'A test custom tool',
          tags: ['test'],
          configuration: {
            query: 'FROM test_index | LIMIT 10',
            params: {},
          },
        };

        await supertest
          .post('/api/chat/tools')
          .set('kbn-xsrf', 'kibana')
          .send(customTool)
          .expect(200);

        const mixedToolIds = ['.search', 'test-custom-tool'];

        const response = await supertest
          .post('/internal/chat/tools/_bulk_delete')
          .set('kbn-xsrf', 'kibana')
          .send({ ids: mixedToolIds })
          .expect(200);

        expect(response.body).to.have.property('results');
        expect(response.body.results).to.be.an('array');
        expect(response.body.results).to.have.length(2);

        // Builtin tool should fail
        const builtinResult = response.body.results.find((r: any) => r.toolId === '.search');
        expect(builtinResult).to.have.property('success', false);
        expect(builtinResult.reason.error.message).to.contain("is read-only and can't be deleted");

        // Custom tool should succeed
        const customResult = response.body.results.find(
          (r: any) => r.toolId === 'test-custom-tool'
        );
        expect(customResult).to.have.property('success', true);
      });
    });
  });
}
