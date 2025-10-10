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
      await onechat.navigateToApp('agents');
      expect(await onechat.countAgentsListRows()).to.be.greaterThan(2);
      for (const agent of agents) {
        expect(await onechat.isAgentInList(agent.id)).to.be(true);
      }
    });

    it('filters on search', async function () {
      await onechat.navigateToApp('agents');
      await onechat.searchAgentsList(agents[0].name);
      expect(await onechat.countAgentsListRows()).to.equal(1);
      expect(await onechat.isAgentInList(agents[0].id)).to.be(true);
    });

    it('filters on labels', async function () {
      await onechat.navigateToApp('agents');
      await onechat.selectAgentLabel(agents[0].labels[0]);
      expect(await onechat.countAgentsListRows()).to.equal(1);
      expect(await onechat.isAgentInList(agents[0].id)).to.be(true);
    });

    it('chats with agent', async function () {
      await onechat.navigateToApp('agents');
      await onechat.clickAgentChat(agents[0].id);
    });
  });
}
