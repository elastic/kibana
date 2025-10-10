/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { chatSystemIndex } from '@kbn/onechat-server';
import type { FtrProviderContext } from '../../../functional/ftr_provider_context';

// data-test-subj selectors
const selectors = {
  content: 'agentBuilderAgentsListContent',
  title: 'agentBuilderAgentsListPageTitle',
  newAgentButton: 'agentBuilderNewAgentButton',
  table: 'agentBuilderAgentsListTable',
  row: 'agentBuilderAgentsListRow',
};

const agents = [
  { id: 'test_agent_1', name: 'Test Agent 1', labels: ['first'] },
  { id: 'test_agent_2', name: 'Test Agent 2', labels: ['second'] },
];

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const { onechat } = getPageObjects(['onechat']);
  const testSubjects = getService('testSubjects');
  const es = getService('es');
  const browser = getService('browser');

  describe('Agents List', function () {
    before(async function () {
      for (const agent of agents) {
        await onechat.createAgentViaUI(agent);
      }
    });

    after(async function () {
      await es.deleteByQuery({
        index: chatSystemIndex('agents'),
        query: { match_all: {} },
        wait_for_completion: true,
        refresh: true,
        conflicts: 'proceed',
      });
    });

    it('renders', async function () {
      await onechat.navigateToApp('agents');

      expect(await testSubjects.getVisibleText(selectors.title)).to.contain('Agents');
      await testSubjects.existOrFail(selectors.newAgentButton);
      await testSubjects.existOrFail(selectors.table);
    });

    it('lists created agents', async function () {
      expect(await onechat.countAgentsListRows()).to.be.greaterThan(2);
      for (const agent of agents) {
        await onechat.agentInList(agent.id).existOrFail();
      }
    });

    it('filters on search', async function () {
      const search = onechat.agentsListSearch();
      await search.type(agents[0].name);
      expect(await onechat.countAgentsListRows()).to.equal(1);
      await onechat.agentInList(agents[0].id).existOrFail();
      await search.clear();
    });

    it('filters on labels', async function () {
      await onechat.selectAgentLabel(agents[0].labels[0]);
      expect(await onechat.countAgentsListRows()).to.equal(1);
      await onechat.agentInList(agents[0].id).existOrFail();
    });

    it('chats with agent', async function () {
      await onechat.clickAgentChat(agents[0].id);
      await browser.waitForUrlToBe(`/app/agent_builder/conversations/new?agent_id=${agents[0].id}`);
      const agentText = await testSubjects.getVisibleText('agentBuilderAgentSelectorButton');
      expect(agentText).to.contain(agents[0].name);
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
      const agent = onechat.agentInList(agents[1].id);
      await agent.existOrFail();

      const modal = await onechat.openAgentDeleteModal(agents[1].id);
      const expectedTitle = `Delete ${agents[1].name}`;
      expect(await modal.getTitle()).to.contain(expectedTitle);

      await modal.clickConfirm();
      await agent.missingOrFail();
    });
  });
}
