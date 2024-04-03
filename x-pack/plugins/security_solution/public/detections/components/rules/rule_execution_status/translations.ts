/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const STATUS = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleStatus.statusDescription',
  {
    defaultMessage: 'Last response',
  }
);

export const STATUS_AT = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleStatus.statusAtDescription',
  {
    defaultMessage: 'at',
  }
);

export const STATUS_DATE = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleStatus.statusDateDescription',
  {
    defaultMessage: 'Status date',
  }
);

export const REFRESH = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleStatus.refreshButton',
  {
    defaultMessage: 'Refresh',
  }
);

export const ERROR_CALLOUT_TITLE = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleStatus.errorCalloutTitle',
  {
    defaultMessage: 'Rule failure at',
  }
);

export const PARTIAL_FAILURE_CALLOUT_TITLE = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleStatus.partialErrorCalloutTitle',
  {
    defaultMessage: 'Warning at',
  }
);

export const ASK_ASSISTANT_ERROR_BUTTON = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleStatus.askAssistant',
  {
    defaultMessage: 'Ask Assistant',
  }
);

export const ASK_ASSISTANT_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleStatus.askAssistantDesc',
  {
    defaultMessage: "Rule's execution failure message",
  }
);

export const ASK_ASSISTANT_USER_PROMPT = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleStatus.askAssistantUserPrompt',
  {
    defaultMessage: 'Can you explain this rule execution error and steps to fix?',
  }
);

export const ASK_ASSISTANT_TOOLTIP = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleStatus.askAssistantToolTip',
  {
    defaultMessage: 'Add this rule execution error as context',
  }
);
