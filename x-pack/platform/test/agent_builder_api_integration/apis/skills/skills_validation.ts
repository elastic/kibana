/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { FtrProviderContext } from '../../../api_integration/ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const log = getService('log');

  describe('Skills Validation API', function () {
    this.tags(['skipServerless']);
    const createdSkillIds: string[] = [];
    const BUILTIN_SKILL_ID = 'data-exploration';

    after(async () => {
      for (const skillId of createdSkillIds) {
        try {
          await supertest
            .delete(`/api/agent_builder/skills/${skillId}`)
            .set('kbn-xsrf', 'kibana')
            .expect(200);
        } catch (error) {
          log.warning(`Failed to delete skill ${skillId}: ${error.message}`);
        }
      }
    });

    describe('POST /api/agent_builder/skills - validation', () => {
      it('should reject creating a skill with an invalid ID', async () => {
        const response = await supertest
          .post('/api/agent_builder/skills')
          .set('kbn-xsrf', 'kibana')
          .send({
            id: 'Invalid ID With Spaces',
            name: 'invalid-skill',
            description: 'This should fail',
            content: 'Content.',
            tool_ids: [],
          })
          .expect(400);

        expect(response.body).to.have.property('message');
      });

      it('should reject creating a skill with duplicate ID', async () => {
        const skillId = 'duplicate-test-skill';

        await supertest
          .post('/api/agent_builder/skills')
          .set('kbn-xsrf', 'kibana')
          .send({
            id: skillId,
            name: 'first-skill',
            description: 'First skill',
            content: 'First content.',
            tool_ids: [],
          })
          .expect(200);

        createdSkillIds.push(skillId);

        await supertest
          .post('/api/agent_builder/skills')
          .set('kbn-xsrf', 'kibana')
          .send({
            id: skillId,
            name: 'second-skill',
            description: 'Second skill with duplicate ID',
            content: 'Second content.',
            tool_ids: [],
          })
          .expect(400);
      });
    });

    describe('PUT /api/agent_builder/skills/{skillId} - validation', () => {
      it('should reject updating a built-in skill', async () => {
        await supertest
          .put(`/api/agent_builder/skills/${BUILTIN_SKILL_ID}`)
          .set('kbn-xsrf', 'kibana')
          .send({
            name: 'hacked-name',
            description: 'Attempted modification',
            content: 'Should not work.',
            tool_ids: [],
          })
          .expect(400);
      });

      it('should reject updating a non-existent skill', async () => {
        await supertest
          .put('/api/agent_builder/skills/non-existent-skill-id')
          .set('kbn-xsrf', 'kibana')
          .send({
            name: 'attempted-update',
            description: 'Should fail',
            content: 'Should not work.',
            tool_ids: [],
          })
          .expect(404);
      });
    });

    describe('DELETE /api/agent_builder/skills/{skillId} - validation', () => {
      it('should reject deleting a built-in skill', async () => {
        const response = await supertest
          .delete(`/api/agent_builder/skills/${BUILTIN_SKILL_ID}`)
          .set('kbn-xsrf', 'kibana');

        expect(response.status).not.to.be(200);
      });

      it('should reject deleting a non-existent skill', async () => {
        await supertest
          .delete('/api/agent_builder/skills/non-existent-skill-id')
          .set('kbn-xsrf', 'kibana')
          .expect(404);
      });
    });
  });
}
