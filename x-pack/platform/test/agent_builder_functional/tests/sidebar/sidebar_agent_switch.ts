/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { agentBuilderDefaultAgentId } from '@kbn/agent-builder-common';
import type { LlmProxy } from '../../../agent_builder_api_integration/utils/llm_proxy';
import { createLlmProxy } from '../../../agent_builder_api_integration/utils/llm_proxy';
import { setupAgentDirectAnswer } from '../../../agent_builder_api_integration/utils/proxy_scenario';
import { createAgent, deleteAgent } from '../../../agent_builder_api_integration/utils/agents';
import { createConnector, deleteConnectors } from '../../utils/connector_helpers';
import type { FtrProviderContext } from '../../../functional/ftr_provider_context';

const CUSTOM_AGENT_ID = 'sidebar-test-agent';
const CUSTOM_AGENT_NAME = 'Sidebar Test Agent';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const { agentBuilder } = getPageObjects(['agentBuilder']);
  const testSubjects = getService('testSubjects');
  const log = getService('log');
  const supertest = getService('supertest');
  const retry = getService('retry');
  const es = getService('es');

  describe('Sidebar Agent Switch', function () {
    let llmProxy: LlmProxy;

    before(async () => {
      llmProxy = await createLlmProxy(log);
      await createConnector(llmProxy, supertest);

      await createAgent(
        {
          id: CUSTOM_AGENT_ID,
          name: CUSTOM_AGENT_NAME,
          description: 'A custom agent for sidebar switch testing',
        },
        { supertest }
      );
    });

    after(async () => {
      llmProxy.close();
      await deleteConnectors(supertest);
      await deleteAgent(CUSTOM_AGENT_ID, { supertest });
      await es.deleteByQuery({
        index: '.chat-conversations',
        query: { match_all: {} },
        wait_for_completion: true,
        refresh: true,
        conflicts: 'proceed',
        ignore_unavailable: true,
      });
    });

    it('starts with the default agent selected', async () => {
      await agentBuilder.prepareEmbeddableSidebar();
      await agentBuilder.openEmbeddableMenu();

      const agentRow = await testSubjects.find('agentBuilderEmbeddableAgentRow');
      const agentRowText = await agentRow.getVisibleText();
      expect(agentRowText).to.contain('Elastic AI Agent');

      const browser = getService('browser');
      await browser.pressKeys(browser.keys.ESCAPE);
    });

    it('switching agent resets to a new conversation', async () => {
      await agentBuilder.prepareEmbeddableSidebarWithNewChat();

      // Switch to the custom agent
      await agentBuilder.openEmbeddableMenu();
      await agentBuilder.clickEmbeddableAgentRow();

      await retry.try(async () => {
        await testSubjects.existOrFail(`agentBuilderAgentOption-${CUSTOM_AGENT_ID}`);
      });

      await agentBuilder.selectEmbeddableAgent(CUSTOM_AGENT_ID);

      // Agent options list should close after selection
      await retry.try(async () => {
        await testSubjects.missingOrFail(`agentBuilderAgentOption-${CUSTOM_AGENT_ID}`);
      });

      // Conversation should be reset — no prior response, input form ready
      const hasResponse = await testSubjects.exists('agentBuilderRoundResponse');
      expect(hasResponse).to.be(false);
      await testSubjects.existOrFail('agentBuilderConversationInputForm');
    });

    it('new conversation uses the switched agent', async () => {
      const MOCKED_INPUT = 'message with the custom agent';
      const MOCKED_RESPONSE = 'response from the custom agent';
      const MOCKED_TITLE = 'Custom Agent Conversation';

      await agentBuilder.prepareEmbeddableSidebarWithNewChat();

      // Switch to the custom agent
      await agentBuilder.openEmbeddableMenu();
      await agentBuilder.clickEmbeddableAgentRow();

      await retry.try(async () => {
        await testSubjects.existOrFail(`agentBuilderAgentOption-${CUSTOM_AGENT_ID}`);
      });

      await agentBuilder.selectEmbeddableAgent(CUSTOM_AGENT_ID);

      // Send a message and verify response
      await setupAgentDirectAnswer({
        proxy: llmProxy,
        title: MOCKED_TITLE,
        response: MOCKED_RESPONSE,
      });

      await agentBuilder.typeMessage(MOCKED_INPUT);
      await agentBuilder.sendMessage();

      await llmProxy.waitForAllInterceptorsToHaveBeenCalled();

      await retry.try(async () => {
        const responseElement = await testSubjects.find('agentBuilderRoundResponse');
        const responseText = await responseElement.getVisibleText();
        expect(responseText).to.contain(MOCKED_RESPONSE);
      });

      // The custom agent should still be shown in the menu
      await agentBuilder.openEmbeddableMenu();
      const agentRow = await testSubjects.find('agentBuilderEmbeddableAgentRow');
      const agentRowText = await agentRow.getVisibleText();
      expect(agentRowText).to.contain(CUSTOM_AGENT_NAME);

      const browser = getService('browser');
      await browser.pressKeys(browser.keys.ESCAPE);
    });

    it('can switch back to the default agent', async () => {
      await agentBuilder.prepareEmbeddableSidebarWithNewChat();

      // Switch to the custom agent first
      await agentBuilder.openEmbeddableMenu();
      await agentBuilder.clickEmbeddableAgentRow();

      await retry.try(async () => {
        await testSubjects.existOrFail(`agentBuilderAgentOption-${CUSTOM_AGENT_ID}`);
      });

      await agentBuilder.selectEmbeddableAgent(CUSTOM_AGENT_ID);

      // Now switch back to the default agent
      await agentBuilder.openEmbeddableMenu();
      await agentBuilder.clickEmbeddableAgentRow();

      await retry.try(async () => {
        await testSubjects.existOrFail(`agentBuilderAgentOption-${agentBuilderDefaultAgentId}`);
      });

      await agentBuilder.selectEmbeddableAgent(agentBuilderDefaultAgentId);

      // Agent options list should close after selection
      await retry.try(async () => {
        await testSubjects.missingOrFail(`agentBuilderAgentOption-${agentBuilderDefaultAgentId}`);
      });

      // Conversation should reset to new state
      await retry.try(async () => {
        const hasResponse = await testSubjects.exists('agentBuilderRoundResponse');
        expect(hasResponse).to.be(false);
      });

      await testSubjects.existOrFail('agentBuilderConversationInputForm');
    });
  });
}
