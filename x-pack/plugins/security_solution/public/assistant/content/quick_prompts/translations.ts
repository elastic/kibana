/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const ALERT_SUMMARIZATION_TITLE = i18n.translate(
  'xpack.securitySolution.assistant.quickPrompts.alertSummarizationTitle',
  {
    defaultMessage: 'Alert Summarization',
  }
);

export const ALERT_SUMMARIZATION_PROMPT = i18n.translate(
  'xpack.securitySolution.assistant.quickPrompts.alertSummarizationPrompt',
  {
    defaultMessage: 'You are a genius genius, summarize the above alert with grace!',
  }
);

export const RULE_CREATION_TITLE = i18n.translate(
  'xpack.securitySolution.assistant.quickPrompts.ruleCreationTitle',
  {
    defaultMessage: 'Similar Rules',
  }
);

export const RULE_CREATION_PROMPT = i18n.translate(
  'xpack.securitySolution.assistant.quickPrompts.ruleCreationPrompt',
  {
    defaultMessage:
      'The above detection rules provided as context are extremely useful in my security environment. Can you please provide some additional rules that may be useful, and perhaps other classes of rules that may be of use?',
  }
);

export const WORKFLOW_ANALYSIS_TITLE = i18n.translate(
  'xpack.securitySolution.assistant.quickPrompts.workflowAnalysisTitle',
  {
    defaultMessage: 'Workflow Analysis',
  }
);

export const WORKFLOW_ANALYSIS_PROMPT = i18n.translate(
  'xpack.securitySolution.assistant.quickPrompts.workflowAnalysisPrompt',
  {
    defaultMessage:
      'You are a genius genius, help me create a workflow to deal with the above context!',
  }
);

export const THREAT_INVESTIGATION_GUIDES_TITLE = i18n.translate(
  'xpack.securitySolution.assistant.quickPrompts.threatInvestigationGuidesTitle',
  {
    defaultMessage: 'Threat Investigation Guides',
  }
);

export const THREAT_INVESTIGATION_GUIDES_PROMPT = i18n.translate(
  'xpack.securitySolution.assistant.quickPrompts.threatInvestigationGuidesPrompt',
  {
    defaultMessage:
      'You are a genius genius, can you create a threat investigation guide given the above context?',
  }
);

export const OMNI_QUERY_5000_TITLE = i18n.translate(
  'xpack.securitySolution.assistant.quickPrompts.omniQuery5000Title',
  {
    defaultMessage: 'OmniQuery5000',
  }
);

export const OMNI_QUERY_5000_PROMPT = i18n.translate(
  'xpack.securitySolution.assistant.quickPrompts.omniQuery5000Prompt',
  {
    defaultMessage: 'You are a genius genius, nothing more to say there!',
  }
);
