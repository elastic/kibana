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

  // TODO: The agent creation page (/agents/new) currently has rendering issues
  // in the functional test environment. These tests should be re-enabled once 
  // the agent form rendering issue is resolved.
  describe.skip('Skills on Agent Form', function () {
    this.tags(['skipServerless']);
    let connectorId: string;

    before(async () => {
      // Create a mock LLM connector
      const response = await supertest
        .post('/api/actions/connector')
        .set('kbn-xsrf', 'kibana')
        .send({
          name: 'functional-test-agent-form-llm',
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
    });

    it('should display the Skills tab with the built-in skill toggle', async () => {
      // Navigate to the new agent form
      await pageObjects.agentBuilder.navigateToApp('agents/new');

      // Wait for the agent form page to load
      await retry.try(async () => {
        await testSubjects.existOrFail('agentFormPageTitle', { timeout: 30000 });
      });

      // Click the Skills tab
      await pageObjects.agentBuilder.clickSkillsTab();

      // The built-in data-exploration skill toggle should be visible
      await retry.try(async () => {
        const skillToggle = await pageObjects.agentBuilder.getSkillToggle('data-exploration');
        await expect(skillToggle.isDisplayed()).to.be(true);
      });
    });

    it('should allow toggling skills on and off', async () => {
      // Navigate to new agent form
      await pageObjects.agentBuilder.navigateToApp('agents/new');

      await retry.try(async () => {
        await testSubjects.existOrFail('agentFormPageTitle', { timeout: 30000 });
      });

      // Click Skills tab
      await pageObjects.agentBuilder.clickSkillsTab();

      // Get initial state of the skill toggle
      const initialState = await pageObjects.agentBuilder.isSkillToggleChecked('data-exploration');

      // Toggle the skill
      await pageObjects.agentBuilder.toggleSkill('data-exploration');

      // Verify it changed state
      await retry.try(async () => {
        const newState = await pageObjects.agentBuilder.isSkillToggleChecked('data-exploration');
        expect(newState).to.be(!initialState);
      });
    });
  });
}