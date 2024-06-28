/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const ASK_ASSISTANT_ERROR_BUTTON = i18n.translate(
  'xpack.securitySolution.detectionEngine.createRule.stepDefineRule.askAssistant',
  {
    defaultMessage: 'Ask Assistant',
  }
);

export const ASK_ASSISTANT_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.detectionEngine.createRule.stepDefineRule.askAssistantDesc',
  {
    defaultMessage: 'Rule query error',
  }
);

export const ASK_ASSISTANT_USER_PROMPT = i18n.translate(
  'xpack.securitySolution.detectionEngine.createRule.stepDefineRule.askAssistantUserPrompt',
  {
    defaultMessage: 'Explain errors in query and generate query where all errors fixed',
  }
);

export const ASK_ASSISTANT_TOOLTIP = i18n.translate(
  'xpack.securitySolution.detectionEngine.createRule.stepDefineRule.askAssistantToolTip',
  {
    defaultMessage: 'Fix query or generate new one',
  }
);
