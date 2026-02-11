/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FtrProviderContext } from '../../api_integration/ftr_provider_context';

export default function ({ loadTestFile }: FtrProviderContext) {
  describe('AgentBuilder Endpoints', function () {
    loadTestFile(require.resolve('./converse'));
    loadTestFile(require.resolve('./tools/builtin_tools.ts'));
    loadTestFile(require.resolve('./tools/builtin_tools_internal.ts'));
    loadTestFile(require.resolve('./tools/esql_tools.ts'));
    loadTestFile(require.resolve('./tools/esql_tools_internal.ts'));
    loadTestFile(require.resolve('./tools/legacy_tool_types_migration.ts'));
    loadTestFile(require.resolve('./tools/index_search_tools.ts'));
    loadTestFile(require.resolve('./agents.ts'));
    loadTestFile(require.resolve('./conversations.ts'));
    loadTestFile(require.resolve('./spaces.ts'));
  });
}
