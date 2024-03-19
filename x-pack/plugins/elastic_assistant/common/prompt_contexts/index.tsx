/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PromptContext, PromptContextTemplate } from '@kbn/elastic-assistant';
import * as i18n from './translations';
import * as i18nUserPrompts from '../prompts/user/translations';

export const PROMPT_CONTEXT_ALERT_CATEGORY = 'alert';
export const PROMPT_CONTEXT_EVENT_CATEGORY = 'event';
export const PROMPT_CONTEXT_DETECTION_RULES_CATEGORY = 'detection-rules';
export const DATA_QUALITY_DASHBOARD_CATEGORY = 'data-quality-dashboard';
export const KNOWLEDGE_BASE_CATEGORY = 'knowledge-base';

/**
 * Global list of PromptContexts intended to be used throughout Security Solution.
 * Useful if wanting to see all available PromptContexts in one place, or if needing
 * a unique set of categories to reference since the PromptContexts available on
 * useAssistantContext are dynamic (not globally registered).
 */
export const PROMPT_CONTEXTS: Record<PromptContext['category'], PromptContextTemplate> = {
  /**
   * Alert summary view context, made available on the alert details flyout
   */
  [PROMPT_CONTEXT_ALERT_CATEGORY]: {
    category: PROMPT_CONTEXT_ALERT_CATEGORY,
    consumer: 'securitySolutionUI',
    suggestedUserPrompt:
      i18nUserPrompts.EXPLAIN_THEN_SUMMARIZE_SUGGEST_INVESTIGATION_GUIDE_NON_I18N,
    description: i18nUserPrompts.ALERT_SUMMARY_CONTEXT_DESCRIPTION(i18n.VIEW),
    tooltip: i18nUserPrompts.ALERT_SUMMARY_VIEW_CONTEXT_TOOLTIP,
  },
  document: {
    category: 'document',
    consumer: 'discover',
    suggestedUserPrompt:
      'Explain the results above, and describe some options to fix incompatibilities.',
    description: 'Document',
    tooltip: 'Add this document as context',
  },
  /**
   * Event summary view context, made available from Timeline events
   */
  [PROMPT_CONTEXT_EVENT_CATEGORY]: {
    category: PROMPT_CONTEXT_EVENT_CATEGORY,
    consumer: 'securitySolutionUI',
    suggestedUserPrompt:
      i18nUserPrompts.EXPLAIN_THEN_SUMMARIZE_SUGGEST_INVESTIGATION_GUIDE_NON_I18N,
    description: i18nUserPrompts.EVENT_SUMMARY_CONTEXT_DESCRIPTION(i18n.VIEW),
    tooltip: i18nUserPrompts.EVENT_SUMMARY_VIEW_CONTEXT_TOOLTIP,
  },
  /**
   * Data Quality dashboard context, made available on the Data Quality dashboard
   */
  [DATA_QUALITY_DASHBOARD_CATEGORY]: {
    category: DATA_QUALITY_DASHBOARD_CATEGORY,
    consumer: 'securitySolutionUI',
    suggestedUserPrompt: i18nUserPrompts.DATA_QUALITY_SUGGESTED_USER_PROMPT,
    description: i18nUserPrompts.DATA_QUALITY_PROMPT_CONTEXT_PILL(i18n.INDEX),
    tooltip: i18nUserPrompts.DATA_QUALITY_PROMPT_CONTEXT_PILL_TOOLTIP,
  },
  /**
   * Detection Rules context, made available on the Rule Management page when rules are selected
   */
  [PROMPT_CONTEXT_DETECTION_RULES_CATEGORY]: {
    category: PROMPT_CONTEXT_DETECTION_RULES_CATEGORY,
    consumer: 'securitySolutionUI',
    suggestedUserPrompt: i18nUserPrompts.EXPLAIN_THEN_SUMMARIZE_RULE_DETAILS,
    description: i18nUserPrompts.RULE_MANAGEMENT_CONTEXT_DESCRIPTION,
    tooltip: i18nUserPrompts.RULE_MANAGEMENT_CONTEXT_TOOLTIP,
  },
};
