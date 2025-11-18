/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AGENT_BUILDER_ENABLED_SETTING_ID } from '@kbn/management-settings-ids';
import type { FtrProviderContext } from '../../api_integration/ftr_provider_context';

export default function ({ loadTestFile, getService }: FtrProviderContext) {
  describe('AgentBuilder Endpoints', function () {
    const kibanaServer = getService('kibanaServer');

    before(async () => {
      await kibanaServer.uiSettings.update({
        [AGENT_BUILDER_ENABLED_SETTING_ID]: true,
      });
    });

    after(async () => {
      await kibanaServer.uiSettings.update({
        [AGENT_BUILDER_ENABLED_SETTING_ID]: false,
      });
    });

    loadTestFile(require.resolve('./converse/simple_conversation.ts'));
    loadTestFile(require.resolve('./converse/tool_calling.ts'));
    loadTestFile(require.resolve('./converse/attachments.ts'));
    loadTestFile(require.resolve('./converse/error_handling.ts'));
    loadTestFile(require.resolve('./esql_tools.ts'));
    loadTestFile(require.resolve('./esql_tools_internal.ts'));
    loadTestFile(require.resolve('./agents.ts'));
    loadTestFile(require.resolve('./conversations.ts'));
    loadTestFile(require.resolve('./builtin_tools.ts'));
    loadTestFile(require.resolve('./builtin_tools_internal.ts'));
    loadTestFile(require.resolve('./spaces.ts'));
  });
}
