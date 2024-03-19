/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const THEN_SUMMARIZE_SUGGESTED_KQL_AND_EQL_QUERIES = i18n.translate(
  'xpack.securitySolution.assistant.content.prompts.user.thenSummarizeSuggestedKqlAndEqlQueries',
  {
    defaultMessage:
      'Evaluate the event from the context above and format your output neatly in markdown syntax for my Elastic Security case.',
  }
);

export const FINALLY_SUGGEST_INVESTIGATION_GUIDE_AND_FORMAT_AS_MARKDOWN = i18n.translate(
  'xpack.securitySolution.assistant.content.prompts.user.finallySuggestInvestigationGuideAndFormatAsMarkdown',
  {
    defaultMessage: `Add your description, recommended actions and bulleted triage steps. Use the MITRE ATT&CK data provided to add more context and recommendations from MITRE, and hyperlink to the relevant pages on MITRE\'s website. Be sure to include the user and host risk score data from the context. Your response should include steps that point to Elastic Security specific features, including endpoint response actions, the Elastic Agent OSQuery manager integration (with example osquery queries), timelines and entity analytics and link to all the relevant Elastic Security documentation.`,
  }
);

export const ALERT_SUMMARY_CONTEXT_DESCRIPTION = (view: string) =>
  i18n.translate('xpack.securitySolution.alertSummaryView.alertSummaryViewContextDescription', {
    defaultMessage: 'Alert (from {view})',
    values: { view },
  });

export const ALERT_SUMMARY_VIEW_CONTEXT_TOOLTIP = i18n.translate(
  'xpack.securitySolution.alertSummaryView.alertSummaryViewContextTooltip',
  {
    defaultMessage: 'Add this alert as context',
  }
);

export const EVENT_SUMMARY_CONVERSATION_ID = i18n.translate(
  'xpack.securitySolution.alertSummaryView.eventSummaryViewConversationId',
  {
    defaultMessage: 'Event summary',
  }
);

export const EVENT_SUMMARY_CONTEXT_DESCRIPTION = (view: string) =>
  i18n.translate('xpack.securitySolution.alertSummaryView.eventSummaryViewContextDescription', {
    defaultMessage: 'Event (from {view})',
    values: { view },
  });

export const EVENT_SUMMARY_VIEW_CONTEXT_TOOLTIP = i18n.translate(
  'xpack.securitySolution.alertSummaryView.eventSummaryViewContextTooltip',
  {
    defaultMessage: 'Add this event as context',
  }
);

export const DATA_QUALITY_SUGGESTED_USER_PROMPT = i18n.translate(
  'securitySolutionPackages.ecsDataQualityDashboard.dataQualitySuggestedUserPrompt',
  {
    defaultMessage:
      'Explain the results above, and describe some options to fix incompatibilities.',
  }
);

export const DATA_QUALITY_PROMPT_CONTEXT_PILL = (indexName: string) =>
  i18n.translate('securitySolutionPackages.ecsDataQualityDashboard.dataQualityPromptContextPill', {
    values: { indexName },
    defaultMessage: 'Data Quality ({indexName})',
  });

export const DATA_QUALITY_PROMPT_CONTEXT_PILL_TOOLTIP = i18n.translate(
  'securitySolutionPackages.ecsDataQualityDashboard.dataQualityPromptContextPillTooltip',
  {
    defaultMessage: 'Add this Data Quality report as context',
  }
);

export const EXPLAIN_THEN_SUMMARIZE_RULE_DETAILS = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleManagement.explainThenSummarizeRuleDetails',
  {
    defaultMessage:
      "Please explain the selected rules above. For each rule, highlight why they are relevant, the query as published on Elastic's detection rules repository and an in-depth explanation of it, and what they typically mean for an organization if detected.",
  }
);

export const RULE_MANAGEMENT_CONTEXT_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleManagement.ruleManagementContextDescription',
  {
    defaultMessage: 'Selected Detection Rules',
  }
);

export const RULE_MANAGEMENT_CONTEXT_TOOLTIP = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleManagement.ruleManagementContextTooltip',
  {
    defaultMessage: 'Add this alert as context',
  }
);

export const EXPLAIN_THEN_SUMMARIZE_SUGGEST_INVESTIGATION_GUIDE_NON_I18N = `${THEN_SUMMARIZE_SUGGESTED_KQL_AND_EQL_QUERIES}
${FINALLY_SUGGEST_INVESTIGATION_GUIDE_AND_FORMAT_AS_MARKDOWN}`;
