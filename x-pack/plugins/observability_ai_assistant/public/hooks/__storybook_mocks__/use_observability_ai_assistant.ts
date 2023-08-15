/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

<<<<<<<< HEAD:x-pack/plugins/observability_ai_assistant/public/hooks/__storybook_mocks__/use_observability_ai_assistant.ts
const service = {
  start: async () => {
    return {
      getFunctions: [],
    };
  },
};

export function useObservabilityAIAssistant() {
  return service;
}
========
import { i18n } from '@kbn/i18n';

export const RULE_PREVIEW_TITLE = i18n.translate(
  'xpack.securitySolution.detectionEngine.createRule.rulePreviewTitle',
  {
    defaultMessage: 'Rule preview',
  }
);
>>>>>>>> whats-new:x-pack/plugins/security_solution/public/detection_engine/rule_creation_ui/pages/translations.ts
