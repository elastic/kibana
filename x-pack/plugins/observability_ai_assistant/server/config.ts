/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

<<<<<<<< HEAD:x-pack/plugins/observability_ai_assistant/server/config.ts
import { schema, type TypeOf } from '@kbn/config-schema';

export const config = schema.object({
  enabled: schema.boolean({ defaultValue: true }),
});

export type ObservabilityAIAssistantConfig = TypeOf<typeof config>;
========
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ loadTestFile }: FtrProviderContext) {
  describe('security cases', function () {
    loadTestFile(require.resolve('./list_view'));
  });
}
>>>>>>>> whats-new:x-pack/test/screenshot_creation/apps/response_ops_docs/security_cases/index.ts
