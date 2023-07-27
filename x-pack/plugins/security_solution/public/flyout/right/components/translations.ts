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
  { defaultMessage: 'Expand alert details' }
);

export const COLLAPSE_DETAILS_BUTTON = i18n.translate(
  'xpack.securitySolution.flyout.documentDetails.collapseDetailButton',
  { defaultMessage: 'Collapse alert details' }
);

export const DOCUMENT_DETAILS = i18n.translate(
  'xpack.securitySolution.flyout.documentDetails.headerTitle',
  { defaultMessage: 'Document details' }
);

export const SEVERITY_TITLE = i18n.translate(
  'xpack.securitySolution.flyout.documentDetails.severityTitle',
  {
    defaultMessage: 'Severity',
  }
);

export const STATUS_TITLE = i18n.translate(
  'xpack.securitySolution.flyout.documentDetails.statusTitle',
  {
    defaultMessage: 'Status',
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
    defaultMessage: 'Rule summary',
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

export const DOCUMENT_DESCRIPTION_TITLE = i18n.translate(
  'xpack.securitySolution.flyout.documentDetails.documentDescriptionTitle',
  {
    defaultMessage: 'Document description',
  }
);
export const DOCUMENT_DESCRIPTION_EXPAND_BUTTON = i18n.translate(
  'xpack.securitySolution.flyout.documentDetails.documentDescriptionExpandButton',
  {
    defaultMessage: 'Expand',
  }
);
export const DOCUMENT_DESCRIPTION_COLLAPSE_BUTTON = i18n.translate(
  'xpack.securitySolution.flyout.documentDetails.documentDescriptionCollapseButton',
  {
    defaultMessage: 'Collapse',
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

/* Insights section */

export const ENTITIES_TITLE = i18n.translate(
  'xpack.securitySolution.flyout.documentDetails.entitiesTitle',
  { defaultMessage: 'Entities' }
);

export const THREAT_INTELLIGENCE_TITLE = i18n.translate(
  'xpack.securitySolution.flyout.documentDetails.threatIntelligenceTitle',
  { defaultMessage: 'Threat Intelligence' }
);

export const INSIGHTS_TITLE = i18n.translate(
  'xpack.securitySolution.flyout.documentDetails.insightsTitle',
  { defaultMessage: 'Insights' }
);

export const CORRELATIONS_TITLE = i18n.translate(
  'xpack.securitySolution.flyout.documentDetails.correlationsTitle',
  { defaultMessage: 'Correlations' }
);

export const PREVALENCE_TITLE = i18n.translate(
  'xpack.securitySolution.flyout.documentDetails.prevalenceTitle',
  { defaultMessage: 'Prevalence' }
);

export const TECHNICAL_PREVIEW_TITLE = i18n.translate(
  'xpack.securitySolution.flyout.documentDetails.technicalPreviewTitle',
  { defaultMessage: 'Technical Preview' }
);

export const TECHNICAL_PREVIEW_MESSAGE = i18n.translate(
  'xpack.securitySolution.flyout.documentDetails.technicalPreviewMessage',
  {
    defaultMessage:
      'This functionality is in technical preview and may be changed or removed completely in a future release. Elastic will take a best effort approach to fix any issues, but features in technical preview are not subject to the support SLA of official GA features.',
  }
);

export const ENTITIES_TEXT = i18n.translate(
  'xpack.securitySolution.flyout.documentDetails.overviewTab.entitiesText',
  {
    defaultMessage: 'entities',
  }
);

export const THREAT_INTELLIGENCE_TEXT = i18n.translate(
  'xpack.securitySolution.flyout.documentDetails.overviewTab.threatIntelligenceText',
  {
    defaultMessage: 'fields of threat intelligence',
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

export const CORRELATIONS_TEXT = i18n.translate(
  'xpack.securitySolution.flyout.documentDetails.overviewTab.correlationsText',
  {
    defaultMessage: 'fields of correlation',
  }
);

export const CORRELATIONS_ANCESTRY_ALERT = i18n.translate(
  'xpack.securitySolution.flyout.documentDetails.overviewTab.correlations.ancestryAlert',
  {
    defaultMessage: 'alert related by ancestry',
  }
);

export const CORRELATIONS_ANCESTRY_ALERTS = i18n.translate(
  'xpack.securitySolution.flyout.documentDetails.overviewTab.correlations.ancestryAlerts',
  {
    defaultMessage: 'alerts related by ancestry',
  }
);
export const CORRELATIONS_SAME_SOURCE_EVENT_ALERT = i18n.translate(
  'xpack.securitySolution.flyout.documentDetails.overviewTab.correlations.sameSourceEventAlert',
  {
    defaultMessage: 'alert related by the same source event',
  }
);

export const CORRELATIONS_SAME_SOURCE_EVENT_ALERTS = i18n.translate(
  'xpack.securitySolution.flyout.documentDetails.overviewTab.correlations.sameSourceEventAlerts',
  {
    defaultMessage: 'alerts related by the same source event',
  }
);
export const CORRELATIONS_SAME_SESSION_ALERT = i18n.translate(
  'xpack.securitySolution.flyout.documentDetails.overviewTab.correlations.sameSessionAlert',
  {
    defaultMessage: 'alert related by session',
  }
);

export const CORRELATIONS_SAME_SESSION_ALERTS = i18n.translate(
  'xpack.securitySolution.flyout.documentDetails.overviewTab.correlations.sameSessionAlerts',
  {
    defaultMessage: 'alerts related by session',
  }
);
export const CORRELATIONS_RELATED_CASE = i18n.translate(
  'xpack.securitySolution.flyout.documentDetails.overviewTab.correlations.relatedCase',
  {
    defaultMessage: 'related case',
  }
);

export const CORRELATIONS_RELATED_CASES = i18n.translate(
  'xpack.securitySolution.flyout.documentDetails.overviewTab.correlations.relatedCases',
  {
    defaultMessage: 'related cases',
  }
);

export const PREVALENCE_TEXT = i18n.translate(
  'xpack.securitySolution.flyout.documentDetails.overviewTab.prevalenceText',
  {
    defaultMessage: 'fields of prevalence',
  }
);

export const PREVALENCE_ROW_UNCOMMON = i18n.translate(
  'xpack.securitySolution.flyout.documentDetails.overviewTab.prevalenceRowText',
  {
    defaultMessage: 'is uncommon',
  }
);

export const VIEW_ALL = (text: string) =>
  i18n.translate('xpack.securitySolution.flyout.documentDetails.overviewTab.viewAllButton', {
    values: { text },
    defaultMessage: 'View all {text}',
  });
export const VISUALIZATIONS_TITLE = i18n.translate(
  'xpack.securitySolution.flyout.documentDetails.visualizationsTitle',
  { defaultMessage: 'Visualizations' }
);

export const ANALYZER_PREVIEW_TITLE = i18n.translate(
  'xpack.securitySolution.flyout.documentDetails.analyzerPreviewTitle',
  { defaultMessage: 'Analyzer preview' }
);

export const ANALYZER_PREVIEW_TEXT = i18n.translate(
  'xpack.securitySolution.flyout.documentDetails.analyzerPreviewText',
  {
    defaultMessage: 'analyzer preview.',
  }
);

export const SHARE = i18n.translate('xpack.securitySolution.flyout.documentDetails.share', {
  defaultMessage: 'Share Alert',
});

export const INVESTIGATION_GUIDE_TITLE = i18n.translate(
  'xpack.securitySolution.flyout.documentDetails.investigationGuideText',
  {
    defaultMessage: 'Investigation guide',
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
