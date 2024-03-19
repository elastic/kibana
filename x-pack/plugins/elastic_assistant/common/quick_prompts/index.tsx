/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QuickPrompt } from '@kbn/elastic-assistant';
import { i18n } from '@kbn/i18n';
import * as i18n1 from './translations';
import {
  KNOWLEDGE_BASE_CATEGORY,
  PROMPT_CONTEXT_ALERT_CATEGORY,
  PROMPT_CONTEXT_DETECTION_RULES_CATEGORY,
  PROMPT_CONTEXT_EVENT_CATEGORY,
} from '../prompt_contexts';

/**
 * Global list of QuickPrompts intended to be used throughout Security Solution.
 * Useful if wanting to see all available QuickPrompts in one place, or if needing
 * to reference when constructing a new chat window to include a QuickPrompt.
 */
export const BASE_SECURITY_QUICK_PROMPTS: QuickPrompt[] = [
  {
    title: i18n.translate('xpack.securitySolution.assistant.quickPrompts.alertSummarizationTitle', {
      defaultMessage: 'Discover summarization',
    }),
    consumer: 'discover',
    prompt: i18n.translate(
      'xpack.securitySolution.assistant.quickPrompts.alertSummarizationTitle',
      {
        defaultMessage:
          'As an expert in logs analytics, provide a breakdown of the attached document and summarize what it might mean for my organization.',
      }
    ),
    color: '#F68FBE',
    isDefault: true,
  },
  {
    title: i18n1.ALERT_SUMMARIZATION_TITLE,
    prompt: i18n1.ALERT_SUMMARIZATION_PROMPT,
    color: '#F68FBE',
    categories: [PROMPT_CONTEXT_ALERT_CATEGORY],
    consumer: 'securitySolutionUI',
    isDefault: true,
  },
  {
    title: i18n1.ESQL_QUERY_GENERATION_TITLE,
    prompt: i18n1.ESQL_QUERY_GENERATION_PROMPT,
    color: '#9170B8',
    categories: [KNOWLEDGE_BASE_CATEGORY],
    consumer: 'securitySolutionUI',
    isDefault: true,
  },
  {
    title: i18n1.RULE_CREATION_TITLE,
    prompt: i18n1.RULE_CREATION_PROMPT,
    categories: [PROMPT_CONTEXT_DETECTION_RULES_CATEGORY],
    consumer: 'securitySolutionUI',
    color: '#7DDED8',
    isDefault: true,
  },
  {
    title: i18n1.WORKFLOW_ANALYSIS_TITLE,
    prompt: i18n1.WORKFLOW_ANALYSIS_PROMPT,
    consumer: 'securitySolutionUI',
    color: '#36A2EF',
    isDefault: true,
  },
  {
    title: i18n1.THREAT_INVESTIGATION_GUIDES_TITLE,
    prompt: i18n1.THREAT_INVESTIGATION_GUIDES_PROMPT,
    categories: [PROMPT_CONTEXT_EVENT_CATEGORY],
    consumer: 'securitySolutionUI',
    color: '#F3D371',
    isDefault: true,
  },
  {
    title: i18n1.SPL_QUERY_CONVERSION_TITLE,
    prompt: i18n1.SPL_QUERY_CONVERSION_PROMPT,
    consumer: 'securitySolutionUI',
    color: '#BADA55',
    isDefault: true,
  },
  {
    title: i18n1.AUTOMATION_TITLE,
    prompt: i18n1.AUTOMATION_PROMPT,
    consumer: 'securitySolutionUI',
    color: '#FFA500',
    isDefault: true,
  },
];
