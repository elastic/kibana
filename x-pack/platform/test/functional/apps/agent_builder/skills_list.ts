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

  describe('Skills List Page', function () {
    this.tags(['skipServerless']);
    const createdSkillIds: string[] = [];
    let connectorId: string;

    before(async () => {
      // Create a mock LLM connector so the Agent Builder app is accessible
      const response = await supertest
        .post('/api/actions/connector')
        .set('kbn-xsrf', 'kibana')
        .send({
          name: 'functional-test-llm-connector',
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

    after(async () => {
      // Clean up connector
      if (connectorId) {
        await supertest
          .delete(`/api/actions/connector/${connectorId}`)
          .set('kbn-xsrf', 'kibana');
      }

      // Clean up created skills
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

    beforeEach(async () => {
      await pageObjects.agentBuilder.navigateToSkills();
    });

    it('should display the skills page with the built-in data-exploration skill', async () => {
      const skillsContainer = await pageObjects.agentBuilder.getSkillsPageContainer();
      await expect(skillsContainer.isDisplayed()).to.be(true);

      const skillsTable = await pageObjects.agentBuilder.getSkillsTable();
      await expect(skillsTable.isDisplayed()).to.be(true);

      // The built-in data-exploration skill should be visible
      await retry.try(async () => {
        const hasBuiltinSkill = await pageObjects.agentBuilder.isSkillInTable('data-exploration');
        expect(hasBuiltinSkill).to.be(true);
      });

      // New skill button should be visible
      const newSkillButton = await pageObjects.agentBuilder.getNewSkillButton();
      await expect(newSkillButton.isDisplayed()).to.be(true);
    });

    it('should have a search input for filtering skills', async () => {
      const searchInput = await pageObjects.agentBuilder.getSkillsSearchInput();
      await expect(searchInput.isDisplayed()).to.be(true);

      // Test search functionality
      await pageObjects.agentBuilder.searchForSkill('zzz_nonexistent_skill_xyz');
      
      // Clear search to reset
      await pageObjects.agentBuilder.clearSkillsSearch();
      
      // Table should still be visible after clearing search
      const skillsTable = await pageObjects.agentBuilder.getSkillsTable();
      await expect(skillsTable.isDisplayed()).to.be(true);
    });

    it('should navigate to create skill form when clicking "New skill" button', async () => {
      await pageObjects.agentBuilder.clickNewSkillButton();

      // Should navigate to skill form page
      await retry.try(async () => {
        const formPage = await pageObjects.agentBuilder.getSkillFormPage();
        await expect(formPage.isDisplayed()).to.be(true);
      });

      // Verify form elements are present
      const idInput = await pageObjects.agentBuilder.getSkillIdInput();
      const nameInput = await pageObjects.agentBuilder.getSkillNameInput();
      const descriptionInput = await pageObjects.agentBuilder.getSkillDescriptionInput();
      const contentInput = await pageObjects.agentBuilder.getSkillContentInput();

      await expect(idInput.isDisplayed()).to.be(true);
      await expect(nameInput.isDisplayed()).to.be(true);
      await expect(descriptionInput.isDisplayed()).to.be(true);
      await expect(contentInput.isDisplayed()).to.be(true);
    });
  });
}