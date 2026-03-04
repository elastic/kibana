/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FtrProviderContext } from '../../api_integration/ftr_provider_context';

export default function ({ loadTestFile }: FtrProviderContext) {
  describe('AgentBuilder Endpoints (part 2)', function () {
    loadTestFile(require.resolve('./tools/index_search_tools.ts'));
    loadTestFile(require.resolve('./agents.ts'));
    loadTestFile(require.resolve('./conversations.ts'));
    loadTestFile(require.resolve('./rbac.ts'));
    loadTestFile(require.resolve('./attachments.ts'));
    loadTestFile(require.resolve('./spaces.ts'));
    loadTestFile(require.resolve('./skills/skills_crud.ts'));
    loadTestFile(require.resolve('./skills/skills_validation.ts'));
  });
}
