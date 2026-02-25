/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const pageObjects = getPageObjects(['common', 'agentBuilder']);
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');
  const supertest = getService('supertest');

  describe('Skills CRUD Operations', function () {
    this.tags(['skipServerless']);
    const createdSkillIds: string[] = [];
    let connectorId: string;
    let uniqueSkillId: string;

    before(async () => {
      // Create a mock LLM connector
      const response = await supertest
        .post('/api/actions/connector')
        .set('kbn-xsrf', 'kibana')
        .send({
          name: 'functional-test-crud-llm-connector',
          connector_type_id: '.gen-ai',
          config: {
            apiProvider: 'OpenAI',
            apiUrl: 'https://api.openai.com/v1/chat/completions',
          },
          secrets: {
            apiKey: 'test-api-key-not-real',
          },
        })
        .expect(200);
      connectorId = response.body.id;

      // Enable experimental features
      await pageObjects.common.navigateToApp('management');
      await pageObjects.common.navigateToApp('kibana', { hash: '/settings' });
      await testSubjects.setValue('management-settings-editField-agentBuilder:experimentalFeatures', 'true');
      await testSubjects.click('management-settings-saveButton');
    });

    beforeEach(() => {
      uniqueSkillId = `functional-test-skill-${Date.now()}`;
    });

    afterEach(async () => {
      // Clean up the skill created in this test
      if (createdSkillIds.includes(uniqueSkillId)) {
        try {
          await supertest
            .delete(`/api/agent_builder/skills/${uniqueSkillId}`)
            .set('kbn-xsrf', 'kibana');
        } catch (error) {
          // Skill may already be deleted
        }
      }
    });

    after(async () => {
      // Clean up connector
      if (connectorId) {
        await supertest
          .delete(`/api/actions/connector/${connectorId}`)
          .set('kbn-xsrf', 'kibana');
      }

      // Clean up any remaining skills
      for (const skillId of createdSkillIds) {
        try {
          await supertest
            .delete(`/api/agent_builder/skills/${skillId}`)
            .set('kbn-xsrf', 'kibana');
        } catch (error) {
          // Skill may already be deleted
        }
      }
    });

    describe('Create Skill', () => {
      it('should create a new skill via the form', async () => {
        await pageObjects.agentBuilder.navigateToNewSkill();
        
        // Wait for form to load
        await retry.try(async () => {
          const formPage = await pageObjects.agentBuilder.getSkillFormPage();
          await expect(formPage.isDisplayed()).to.be(true);
        });

        // Fill in the form
        await pageObjects.agentBuilder.setSkillId(uniqueSkillId);
        await pageObjects.agentBuilder.setSkillName(uniqueSkillId);
        await pageObjects.agentBuilder.setSkillDescription('Skill created by functional test');
        await pageObjects.agentBuilder.setSkillContent('These are the instructions for this test skill.');

        // Submit the form
        await pageObjects.agentBuilder.clickSkillFormSaveButton();
        createdSkillIds.push(uniqueSkillId);

        // Should navigate back to skills list
        await retry.try(async () => {
          const skillsContainer = await pageObjects.agentBuilder.getSkillsPageContainer();
          await expect(skillsContainer.isDisplayed()).to.be(true);
        });

        // The new skill should appear in the table
        await pageObjects.agentBuilder.searchForSkill(uniqueSkillId);
        await retry.try(async () => {
          const hasNewSkill = await pageObjects.agentBuilder.isSkillInTable(uniqueSkillId);
          expect(hasNewSkill).to.be(true);
        });
      });

      it('should cancel skill creation and return to list', async () => {
        await pageObjects.agentBuilder.navigateToNewSkill();
        
        // Wait for form to load
        await retry.try(async () => {
          const formPage = await pageObjects.agentBuilder.getSkillFormPage();
          await expect(formPage.isDisplayed()).to.be(true);
        });

        // Fill partial data
        await pageObjects.agentBuilder.setSkillId(uniqueSkillId);
        await pageObjects.agentBuilder.setSkillName(uniqueSkillId);

        // Click cancel
        await pageObjects.agentBuilder.clickSkillFormCancelButton();

        // Should navigate back to skills list
        await retry.try(async () => {
          const skillsContainer = await pageObjects.agentBuilder.getSkillsPageContainer();
          await expect(skillsContainer.isDisplayed()).to.be(true);
        });
      });
    });

    describe('View Skill', () => {
      it('should view the built-in data-exploration skill as read-only', async () => {
        await pageObjects.agentBuilder.navigateToSkill('data-exploration');
        
        // Should show the skill details page
        await retry.try(async () => {
          const formPage = await pageObjects.agentBuilder.getSkillFormPage();
          await expect(formPage.isDisplayed()).to.be(true);
        });

        // Should show read-only badge for built-in skills
        await retry.try(async () => {
          const isReadOnlyBadgeVisible = await pageObjects.agentBuilder.isSkillReadOnlyBadgeVisible();
          expect(isReadOnlyBadgeVisible).to.be(true);
        });
      });

      it('should view a user-created skill', async () => {
        // Create a skill via API first
        await supertest
          .post('/api/agent_builder/skills')
          .set('kbn-xsrf', 'kibana')
          .send({
            id: uniqueSkillId,
            name: uniqueSkillId,
            description: 'Description for viewing',
            content: 'Content for viewing.',
            tool_ids: [],
          })
          .expect(200);
        
        createdSkillIds.push(uniqueSkillId);

        // Navigate to the skill detail page
        await pageObjects.agentBuilder.navigateToSkill(uniqueSkillId);
        
        await retry.try(async () => {
          const formPage = await pageObjects.agentBuilder.getSkillFormPage();
          await expect(formPage.isDisplayed()).to.be(true);
        });

        // Should not show read-only badge for user-created skills
        const isReadOnlyBadgeVisible = await pageObjects.agentBuilder.isSkillReadOnlyBadgeVisible();
        expect(isReadOnlyBadgeVisible).to.be(false);
      });
    });

    describe('Edit Skill', () => {
      it('should edit an existing user-created skill', async () => {
        // Create a skill via API first
        await supertest
          .post('/api/agent_builder/skills')
          .set('kbn-xsrf', 'kibana')
          .send({
            id: uniqueSkillId,
            name: uniqueSkillId,
            description: 'Description before edit',
            content: 'Content before edit.',
            tool_ids: [],
          })
          .expect(200);
        
        createdSkillIds.push(uniqueSkillId);

        // Navigate to the skill's detail page
        await pageObjects.agentBuilder.navigateToSkill(uniqueSkillId);
        
        await retry.try(async () => {
          const formPage = await pageObjects.agentBuilder.getSkillFormPage();
          await expect(formPage.isDisplayed()).to.be(true);
        });

        // Should not show read-only badge for user-created skills
        const isReadOnlyBadgeVisible = await pageObjects.agentBuilder.isSkillReadOnlyBadgeVisible();
        expect(isReadOnlyBadgeVisible).to.be(false);

        // Update content field
        await pageObjects.agentBuilder.setSkillContent('Content after edit.');

        // Save
        await pageObjects.agentBuilder.clickSkillFormSaveButton();

        // Should navigate back to skills list
        await retry.try(async () => {
          const skillsContainer = await pageObjects.agentBuilder.getSkillsPageContainer();
          await expect(skillsContainer.isDisplayed()).to.be(true);
        });
      });
    });

    describe('Delete Skill', () => {
      it('should delete a user-created skill via API and verify removal in UI', async () => {
        // Create a skill via API first
        await supertest
          .post('/api/agent_builder/skills')
          .set('kbn-xsrf', 'kibana')
          .send({
            id: uniqueSkillId,
            name: uniqueSkillId,
            description: 'This skill will be deleted',
            content: 'Delete me.',
            tool_ids: [],
          })
          .expect(200);

        // Navigate to skills list and verify the skill is present
        await pageObjects.agentBuilder.navigateToSkills();
        await pageObjects.agentBuilder.searchForSkill(uniqueSkillId);
        
        await retry.try(async () => {
          const hasSkill = await pageObjects.agentBuilder.isSkillInTable(uniqueSkillId);
          expect(hasSkill).to.be(true);
        });

        // Delete via API
        await supertest
          .delete(`/api/agent_builder/skills/${uniqueSkillId}`)
          .set('kbn-xsrf', 'kibana')
          .expect(200);

        // Refresh the page and verify the skill is gone
        await pageObjects.agentBuilder.navigateToSkills();
        await pageObjects.agentBuilder.searchForSkill(uniqueSkillId);
        
        await retry.try(async () => {
          const hasSkill = await pageObjects.agentBuilder.isSkillInTable(uniqueSkillId);
          expect(hasSkill).to.be(false);
        });
      });
    });
  });
}