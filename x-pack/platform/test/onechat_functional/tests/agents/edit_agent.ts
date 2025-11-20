/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { FtrProviderContext } from '../../../functional/ftr_provider_context';
import { setupAgents } from './setup/setup_agents';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const { onechat } = getPageObjects(['onechat']);
  const browser = getService('browser');

  describe('Edit agent', function () {
    const { agents, agentsHooks } = setupAgents({ getPageObjects, getService });
    before(async function () {
      await agentsHooks.before();
    });
    after(async function () {
      await agentsHooks.after();
    });
    let agent = agents[0];

    it('should navigate to agent edit form', async function () {
      await onechat.clickAgentEdit(agent.id);
      await browser.waitForUrlToBe(`/app/agent_builder/agents/${agent.id}`);
    });

    it('should show agent name as page title', async function () {
      expect(await onechat.getAgentFormPageTitle()).to.be(agent.name);
    });

    it('should not have save button enabled', async function () {
      expect(await onechat.agentFormSaveButton().isEnabled()).to.be(false);
    });

    it('should disable agent id input', async function () {
      const idInput = onechat.getAgentIdInput();
      expect(await idInput.getValue()).to.be(agent.id);
      expect(await idInput.isEnabled()).to.be(false);
    });

    it('should edit agent name', async function () {
      expect(await onechat.getAgentFormDisplayName()).to.be(agent.name);
      const editedName = 'Edited Test Agent';
      await onechat.setAgentFormDisplayName(editedName);
      const saveButton = onechat.agentFormSaveButton();
      expect(await saveButton.isEnabled()).to.be(true);
      await saveButton.click();
      expect(await onechat.getAgentRowDisplayName(agent.id)).to.be(editedName);
    });

    it('should clone agent', async function () {
      agent = agents[1];
      await onechat.clickAgentClone(agent.id);
      await browser.waitForUrlToBe(`/app/agent_builder/agents/new?source_id=${agent.id}`);
      expect(await onechat.getAgentFormDisplayName()).to.be(agent.name);
      const idInput = onechat.getAgentIdInput();
      expect(await idInput.getValue()).to.be('test_agent_3');
      expect(await idInput.isEnabled()).to.be(true);
    });
  });
}
