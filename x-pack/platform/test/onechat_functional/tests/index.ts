/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LlmProxy } from '../../onechat_api_integration/utils/llm_proxy';
import type { OneChatUiFtrProviderContext } from '../../onechat/services/functional';
import { setupConnector, teardownConnector } from '../utils/connector_helpers';

export default function ({ loadTestFile, getService }: OneChatUiFtrProviderContext) {
  describe('Agent Builder', function () {
    function llmSetup() {
      let llmProxy: LlmProxy;

      before(async () => {
        llmProxy = await setupConnector(getService);
      });

      after(async () => {
        await teardownConnector(getService, llmProxy);
      });
    }

    describe('converse', function () {
      loadTestFile(require.resolve('./converse/conversation_flow.ts'));
      loadTestFile(require.resolve('./converse/conversation_history.ts'));
      loadTestFile(require.resolve('./converse/conversation_error_handling.ts'));
    });

    describe('tools', function () {
      llmSetup();
      loadTestFile(require.resolve('./tools/create_tool.ts'));
      loadTestFile(require.resolve('./tools/landing_page.ts'));
      loadTestFile(require.resolve('./tools/manage_tool.ts'));
      loadTestFile(require.resolve('./agents/agents_list.ts'));
    });

    describe('agents', function () {
      llmSetup();
      loadTestFile(require.resolve('./agents/agents_list.ts'));
      loadTestFile(require.resolve('./agents/create_agent.ts'));
      loadTestFile(require.resolve('./agents/edit_agent.ts'));
    });
  });
}
