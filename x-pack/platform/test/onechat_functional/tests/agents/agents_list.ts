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
  const testSubjects = getService('testSubjects');
  const browser = getService('browser');

  describe('Agents List', function () {
    const { agents, agentsHooks } = setupAgents({ getPageObjects, getService });
    before(async function () {
      await agentsHooks.before();
    });
    after(async function () {
      await agentsHooks.after();
    });

    it('renders', async function () {
      await onechat.navigateToApp('agents');

      const titleSelector = 'agentBuilderAgentsListPageTitle';
      const newAgentButtonSelector = 'agentBuilderNewAgentButton';
      const tableSelector = 'agentBuilderAgentsListTable';

      expect(await testSubjects.getVisibleText(titleSelector)).to.contain('Agents');
      await testSubjects.existOrFail(newAgentButtonSelector);
      await testSubjects.existOrFail(tableSelector);
    });

    it('lists created agents', async function () {
      expect(await onechat.countAgentsListRows()).to.be.greaterThan(2);
      for (const agent of agents) {
        await onechat.agentExistsOrFail(agent.id);
      }
    });

    it('filters on search', async function () {
      const search = onechat.agentsListSearch();
      await search.type(agents[0].name);
      expect(await onechat.countAgentsListRows()).to.equal(1);
      await onechat.agentExistsOrFail(agents[0].id);
      await search.clear();
      expect(await search.getValue()).to.be('');
    });

    it('filters on labels', async function () {
      await onechat.selectAgentLabel(agents[0].labels[0]);
      expect(await onechat.countAgentsListRows()).to.equal(1);
      await onechat.agentExistsOrFail(agents[0].id);
    });

    it('chats with agent', async function () {
      const agent = agents[0];
      await onechat.clickAgentChat(agent.id);
      await browser.waitForUrlToBe(`/app/agent_builder/conversations/new?agent_id=${agent.id}`);
      const agentText = await testSubjects.getVisibleText('agentBuilderAgentSelectorButton');
      expect(agentText).to.contain(agent.name);
      // go back to agents list
      await onechat.navigateToApp('agents');
    });

    it('has edit link with correct href', async function () {
      const hasEditLink = await onechat.hasAgentEditLink(agents[0].id);
      expect(hasEditLink).to.be(true);
    });

    it('has clone link with correct href', async function () {
      const hasCloneLink = await onechat.hasAgentCloneLink(agents[0].id);
      expect(hasCloneLink).to.be(true);
    });

    it('deletes agent', async function () {
      const agent = agents[1];
      await onechat.agentExistsOrFail(agent.id);

      const modal = await onechat.openAgentDeleteModal(agent.id);
      const expectedTitle = `Delete ${agent.name}`;
      expect(await modal.getTitle()).to.contain(expectedTitle);
      await modal.clickConfirm();

      await onechat.agentMissingOrFail(agent.id);
    });
  });
}
