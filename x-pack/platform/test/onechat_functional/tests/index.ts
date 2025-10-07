/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { OneChatUiFtrProviderContext } from '../../onechat/services/functional';

export default function ({ loadTestFile }: OneChatUiFtrProviderContext) {
  describe('Agent Builder', function () {
    describe('converse', function () {
      loadTestFile(require.resolve('./converse/conversation_flow.ts'));
      loadTestFile(require.resolve('./converse/conversation_history.ts'));
    });

    describe('tools', function () {
      loadTestFile(require.resolve('./tools/create_tool.ts'));
      loadTestFile(require.resolve('./tools/landing_page.ts'));
      loadTestFile(require.resolve('./tools/manage_tool.ts'));
    });
  });
}
