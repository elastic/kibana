/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

/* Header */

export const EXPAND_DETAILS_BUTTON = i18n.translate(
  'xpack.securitySolution.flyout.documentDetails.expandDetailButton',
  { defaultMessage: 'Expand details' }
);

export const COLLAPSE_DETAILS_BUTTON = i18n.translate(
  'xpack.securitySolution.flyout.documentDetails.collapseDetailButton',
  { defaultMessage: 'Collapse details' }
);

export const EVENT_DETAILS = i18n.translate(
  'xpack.securitySolution.flyout.documentDetails.headerTitle',
  { defaultMessage: 'Event details' }
);

export const SEVERITY_TITLE = i18n.translate(
  'xpack.securitySolution.flyout.documentDetails.severityTitle',
  {
    defaultMessage: 'Severity',
  }
);

export const RISK_SCORE_TITLE = i18n.translate(
  'xpack.securitySolution.flyout.documentDetails.riskScoreTitle',
  {
    defaultMessage: 'Risk score',
  }
);

export const RULE_SUMMARY_TEXT = i18n.translate(
  'xpack.securitySolution.flyout.documentDetails.ruleSummaryText',
  {
    defaultMessage: 'Show rule summary',
  }
);

export const ALERT_REASON_DETAILS_TEXT = i18n.translate(
  'xpack.securitySolution.flyout.documentDetails.alertReasonDetailsText',
  {
    defaultMessage: 'Show full reason',
  }
);

/* About section */

export const ABOUT_TITLE = i18n.translate(
  'xpack.securitySolution.flyout.documentDetails.aboutTitle',
  {
    defaultMessage: 'About',
  }
);

export const RULE_DESCRIPTION_TITLE = i18n.translate(
  'xpack.securitySolution.flyout.documentDetails.ruleDescriptionTitle',
  {
    defaultMessage: 'Rule description',
  }
);

export const PREVIEW_RULE_DETAILS = i18n.translate(
  'xpack.securitySolution.flyout.documentDetails.previewRuleDetailsText',
  { defaultMessage: 'Preview rule details' }
);

export const PREVIEW_ALERT_REASON_DETAILS = i18n.translate(
  'xpack.securitySolution.flyout.documentDetails.previewAlertReasonDetailsText',
  { defaultMessage: 'Preview alert reason' }
);

export const DOCUMENT_DESCRIPTION_TITLE = i18n.translate(
  'xpack.securitySolution.flyout.documentDetails.documentDescriptionTitle',
  {
    defaultMessage: 'Document description',
  }
);

export const ALERT_REASON_TITLE = i18n.translate(
  'xpack.securitySolution.flyout.documentDetails.alertReasonTitle',
  {
    defaultMessage: 'Alert reason',
  }
);

export const DOCUMENT_REASON_TITLE = i18n.translate(
  'xpack.securitySolution.flyout.documentDetails.documentReasonTitle',
  {
    defaultMessage: 'Document reason',
  }
);

/* Investigation section */

export const INVESTIGATION_TITLE = i18n.translate(
  'xpack.securitySolution.flyout.documentDetails.investigationSectionTitle',
  {
    defaultMessage: 'Investigation',
  }
);

export const HIGHLIGHTED_FIELDS_TITLE = i18n.translate(
  'xpack.securitySolution.flyout.documentDetails.highlightedFieldsTitle',
  { defaultMessage: 'Highlighted fields' }
);

export const HIGHLIGHTED_FIELDS_FIELD_COLUMN = i18n.translate(
  'xpack.securitySolution.flyout.documentDetails.highlightedFields.fieldColumn',
  { defaultMessage: 'Field' }
);

export const HIGHLIGHTED_FIELDS_VALUE_COLUMN = i18n.translate(
  'xpack.securitySolution.flyout.documentDetails.highlightedFields.valueColumn',
  { defaultMessage: 'Value' }
);

/* Insights section */

export const ENTITIES_TITLE = i18n.translate(
  'xpack.securitySolution.flyout.documentDetails.entitiesTitle',
  { defaultMessage: 'Entities' }
);

export const ENTITIES_NO_DATA_MESSAGE = i18n.translate(
  'xpack.securitySolution.flyout.documentDetails.entitiesNoDataMessage',
  {
    defaultMessage: 'Host and user information are unavailable for this alert',
  }
);

export const THREAT_INTELLIGENCE_TITLE = i18n.translate(
  'xpack.securitySolution.flyout.documentDetails.threatIntelligenceTitle',
  { defaultMessage: 'Threat intelligence' }
);

export const INSIGHTS_TITLE = i18n.translate(
  'xpack.securitySolution.flyout.documentDetails.insightsTitle',
  { defaultMessage: 'Insights' }
);

export const CORRELATIONS_TITLE = i18n.translate(
  'xpack.securitySolution.flyout.documentDetails.correlationsTitle',
  { defaultMessage: 'Correlations' }
);

export const CORRELATIONS_ERROR = i18n.translate(
  'xpack.securitySolution.flyout.documentDetails.correlations.error',
  {
    defaultMessage: 'No correlations data available',
  }
);

export const PREVALENCE_TITLE = i18n.translate(
  'xpack.securitySolution.flyout.documentDetails.prevalenceTitle',
  { defaultMessage: 'Prevalence' }
);

export const PREVALENCE_NO_DATA = i18n.translate(
  'xpack.securitySolution.flyout.documentDetails.prevalenceNoData',
  {
    defaultMessage:
      'Over the last 30 days, the highlighted fields for this alert were observed frequently on other host and user events.',
  }
);

export const THREAT_MATCH_DETECTED = i18n.translate(
  'xpack.securitySolution.flyout.documentDetails.overviewTab.threatIntelligence.threatMatch',
  {
    defaultMessage: `threat match detected`,
  }
);

export const THREAT_MATCHES_DETECTED = i18n.translate(
  'xpack.securitySolution.flyout.documentDetails.overviewTab.threatIntelligence.threatMatches',
  {
    defaultMessage: `threat matches detected`,
  }
);

export const THREAT_ENRICHMENT = i18n.translate(
  'xpack.securitySolution.flyout.documentDetails.overviewTab.threatIntelligence.threatEnrichment',
  {
    defaultMessage: `field enriched with threat intelligence`,
  }
);

export const THREAT_ENRICHMENTS = i18n.translate(
  'xpack.securitySolution.flyout.documentDetails.overviewTab.threatIntelligence.threatEnrichments',
  {
    defaultMessage: `fields enriched with threat intelligence`,
  }
);

export const PREVALENCE_ROW_UNCOMMON = i18n.translate(
  'xpack.securitySolution.flyout.documentDetails.overviewTab.prevalenceRowText',
  {
    defaultMessage: 'is uncommon',
  }
);

export const VISUALIZATIONS_TITLE = i18n.translate(
  'xpack.securitySolution.flyout.documentDetails.visualizationsTitle',
  { defaultMessage: 'Visualizations' }
);

export const ANALYZER_PREVIEW_TITLE = i18n.translate(
  'xpack.securitySolution.flyout.documentDetails.analyzerPreviewTitle',
  { defaultMessage: 'Analyzer preview' }
);

export const SHARE = i18n.translate('xpack.securitySolution.flyout.documentDetails.share', {
  defaultMessage: 'Share Alert',
});

export const INVESTIGATION_GUIDE_TITLE = i18n.translate(
  'xpack.securitySolution.flyout.documentDetails.investigationGuideTitle',
  {
    defaultMessage: 'Investigation guide',
  }
);

export const INVESTIGATION_GUIDE_BUTTON = i18n.translate(
  'xpack.securitySolution.flyout.documentDetails.investigationGuideButton',
  {
    defaultMessage: 'Show investigation guide',
  }
);

export const INVESTIGATION_GUIDE_NO_DATA = i18n.translate(
  'xpack.securitySolution.flyout.documentDetails.investigationGuideNoData',
  {
    defaultMessage: 'There’s no investigation guide for this rule.',
  }
);

export const SESSION_PREVIEW_TITLE = i18n.translate(
  'xpack.securitySolution.flyout.documentDetails.sessionPreview.title',
  {
    defaultMessage: 'Session viewer preview',
  }
);

export const SESSION_PREVIEW_PROCESS_TEXT = i18n.translate(
  'xpack.securitySolution.flyout.documentDetails.sessionPreview.processText',
  {
    defaultMessage: 'started',
  }
);

export const SESSION_PREVIEW_TIME_TEXT = i18n.translate(
  'xpack.securitySolution.flyout.documentDetails.sessionPreview.timeText',
  {
    defaultMessage: 'at',
  }
);

export const SESSION_PREVIEW_RULE_TEXT = i18n.translate(
  'xpack.securitySolution.flyout.documentDetails.sessionPreview.ruleText',
  {
    defaultMessage: 'with rule',
  }
);

export const SESSION_PREVIEW_COMMAND_TEXT = i18n.translate(
  'xpack.securitySolution.flyout.documentDetails.sessionPreview.commandText',
  {
    defaultMessage: 'by',
  }
);

export const RESPONSE_TITLE = i18n.translate(
  'xpack.securitySolution.flyout.documentDetails.responseSectionTitle',
  {
    defaultMessage: 'Response',
  }
);

export const RESPONSE_EMPTY = i18n.translate('xpack.securitySolution.flyout.response.empty', {
  defaultMessage: 'This alert did not generate an external notification.',
});

export const TECHNICAL_PREVIEW_TITLE = i18n.translate(
  'xpack.securitySolution.flyout.documentDetails.technicalPreviewTitle',
  { defaultMessage: 'Technical preview' }
);

export const TECHNICAL_PREVIEW_MESSAGE = i18n.translate(
  'xpack.securitySolution.flyout.documentDetails.technicalPreviewMessage',
  {
    defaultMessage:
      'This functionality is in technical preview and may be changed or removed completely in a future release. Elastic will take a best effort approach to fix any issues, but features in technical preview are not subject to the support SLA of official GA features.',
  }
);
