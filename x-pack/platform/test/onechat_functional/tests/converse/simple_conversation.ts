/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { FtrProviderContext } from '../../../functional/ftr_provider_context';

const APP_ID = 'agent_builder';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const { common } = getPageObjects(['common']);
  const testSubjects = getService('testSubjects');

  describe('Agent Builder Simple Conversation', function () {
    it('navigates to new conversation page and shows initial state', async () => {
      await common.navigateToApp(APP_ID, { path: 'conversations/new' });

      // Assert the conversation list is empty and shows the no conversations message
      const dataTestSubj = 'agentBuilderNoConversationsMessage';
      await testSubjects.existOrFail(dataTestSubj);
      const noConversationsElement = await testSubjects.find(dataTestSubj);
      const noConversationsText = await noConversationsElement.getVisibleText();
      expect(noConversationsText).to.contain("You haven't started any conversations yet.");

      // Assert the text input box renders
      await testSubjects.existOrFail('agentBuilderConversationInputForm');

      // Assert the default agent is "Elastic AI Agent"
      await testSubjects.existOrFail('agentBuilderAgentSelectorButton');
      const agentButton = await testSubjects.find('agentBuilderAgentSelectorButton');
      const agentText = await agentButton.getVisibleText();
      expect(agentText).to.contain('Elastic AI Agent');
    });
  });
}
