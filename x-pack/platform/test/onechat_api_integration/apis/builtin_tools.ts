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
  const kibanaServer = getService('kibanaServer');

  describe('Builtin Tools API', () => {
    describe('DELETE /api/chat/tools/.nl_search', () => {
      it('should return 400 error when attempting to delete any builtin system tool', async () => {
        // todo: tidy this up; avoiding .researcher_agent tool
        for (const toolId of Object.values(builtinToolIds).slice(0, -1) as string[]) {
          const response = await supertest
            .delete(`/api/chat/tools/${toolId}`)
            .set('kbn-xsrf', 'kibana')
            .expect(400);

          expect(response.body).to.have.property('message');
          expect(response.body.message).to.eql(`Tool ${toolId} is read-only and can't be deleted`);
        }
      });

      it('should return 404 when builtin tools API is disabled', async () => {
        await kibanaServer.uiSettings.update({
          'onechat:api:enabled': false,
        });

        await supertest.delete('/api/chat/tools/.nl_search').set('kbn-xsrf', 'kibana').expect(404);

        await kibanaServer.uiSettings.update({
          'onechat:api:enabled': true,
        });
      });
    });

    describe('PUT /api/chat/tools/.nl_search', () => {
      it('should return 400', async () => {
        await supertest
          .put('/api/chat/tools/.nl_search')
          .set('kbn-xsrf', 'kibana')
          .send({ description: 'Updated description' })
          .expect(400);
      });
    });
  });
}
