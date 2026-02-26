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

  describe('Skills CRUD API', function () {
    this.tags(['skipServerless']);
    const createdSkillIds: string[] = [];
    const BUILTIN_SKILL_ID = 'data-exploration';

    const mockSkill = {
      id: 'test-skill',
      name: 'test-skill',
      description: 'A test skill for e2e testing',
      content: 'This is the skill content with instructions.',
      tool_ids: [],
    };

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

    describe('GET /api/agent_builder/skills', () => {
      it('should list skills including the built-in data-exploration skill', async () => {
        const response = await supertest.get('/api/agent_builder/skills').expect(200);

        expect(response.body).to.have.property('results');
        expect(response.body.results).to.be.an('array');
        expect(response.body.results.length).to.be.greaterThan(0);

        const builtinSkill = response.body.results.find(
          (skill: { id: string }) => skill.id === BUILTIN_SKILL_ID
        );
        expect(builtinSkill).to.be.ok();
        expect(builtinSkill.readonly).to.be(true);
      });

      it('should include user-created skills in list response', async () => {
        const testSkill = {
          ...mockSkill,
          id: 'list-test-skill',
          name: 'list-test-skill',
        };

        await supertest
          .post('/api/agent_builder/skills')
          .set('kbn-xsrf', 'kibana')
          .send(testSkill)
          .expect(200);

        createdSkillIds.push(testSkill.id);

        const response = await supertest.get('/api/agent_builder/skills').expect(200);

        const found = response.body.results.find(
          (skill: { id: string }) => skill.id === testSkill.id
        );
        expect(found).to.be.ok();
        expect(found.readonly).to.be(false);
      });
    });

    describe('POST /api/agent_builder/skills', () => {
      it('should create a new user-created skill', async () => {
        const testSkill = {
          ...mockSkill,
          id: 'create-test-skill',
          name: 'create-test-skill',
        };

        const response = await supertest
          .post('/api/agent_builder/skills')
          .set('kbn-xsrf', 'kibana')
          .send(testSkill)
          .expect(200);

        expect(response.body).to.have.property('id', testSkill.id);
        expect(response.body).to.have.property('description', testSkill.description);
        expect(response.body).to.have.property('content', testSkill.content);
        expect(response.body).to.have.property('readonly', false);

        createdSkillIds.push(testSkill.id);
      });
    });

    describe('GET /api/agent_builder/skills/{skillId}', () => {
      before(async () => {
        await supertest
          .post('/api/agent_builder/skills')
          .set('kbn-xsrf', 'kibana')
          .send({
            ...mockSkill,
            id: 'get-test-skill',
            name: 'get-test-skill',
          })
          .expect(200);

        createdSkillIds.push('get-test-skill');
      });

      it('should retrieve a created skill by ID', async () => {
        const response = await supertest
          .get('/api/agent_builder/skills/get-test-skill')
          .expect(200);

        expect(response.body).to.have.property('id', 'get-test-skill');
        expect(response.body).to.have.property('readonly', false);
      });

      it('should retrieve the built-in skill by ID', async () => {
        const response = await supertest
          .get(`/api/agent_builder/skills/${BUILTIN_SKILL_ID}`)
          .expect(200);

        expect(response.body).to.have.property('id', BUILTIN_SKILL_ID);
        expect(response.body).to.have.property('name', 'data-exploration');
        expect(response.body).to.have.property('description');
        expect(response.body).to.have.property('content');
      });
    });

    describe('PUT /api/agent_builder/skills/{skillId}', () => {
      before(async () => {
        await supertest
          .post('/api/agent_builder/skills')
          .set('kbn-xsrf', 'kibana')
          .send({
            ...mockSkill,
            id: 'update-test-skill',
            name: 'update-test-skill',
          })
          .expect(200);

        createdSkillIds.push('update-test-skill');
      });

      it('should update an existing skill', async () => {
        const response = await supertest
          .put('/api/agent_builder/skills/update-test-skill')
          .set('kbn-xsrf', 'kibana')
          .send({
            name: 'updated-name',
            description: 'Updated description',
            content: 'Updated content.',
            tool_ids: [],
          })
          .expect(200);

        expect(response.body).to.have.property('name', 'updated-name');
        expect(response.body).to.have.property('description', 'Updated description');
        expect(response.body).to.have.property('content', 'Updated content.');
      });
    });

    describe('DELETE /api/agent_builder/skills/{skillId}', () => {
      before(async () => {
        await supertest
          .post('/api/agent_builder/skills')
          .set('kbn-xsrf', 'kibana')
          .send({
            ...mockSkill,
            id: 'delete-test-skill',
            name: 'delete-test-skill',
          })
          .expect(200);
      });

      it('should delete a user-created skill', async () => {
        const response = await supertest
          .delete('/api/agent_builder/skills/delete-test-skill')
          .set('kbn-xsrf', 'kibana')
          .expect(200);

        expect(response.body).to.have.property('success', true);
      });

      it('should return 404 after deleting a skill', async () => {
        await supertest.get('/api/agent_builder/skills/delete-test-skill').expect(404);
      });
    });
  });
}
