/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

const TRANSLATION_NAMESPACE = 'xpack.securitySolution.flyout.documentDetails' as const;

/* Header */

export const EXPAND_DETAILS_BUTTON = i18n.translate(`${TRANSLATION_NAMESPACE}.expandDetailButton`, {
  defaultMessage: 'Expand alert details',
});

export const COLLAPSE_DETAILS_BUTTON = i18n.translate(
  `${TRANSLATION_NAMESPACE}.collapseDetailButton`,
  { defaultMessage: 'Collapse alert details' }
);

export const DOCUMENT_DETAILS = i18n.translate(`${TRANSLATION_NAMESPACE}.headerTitle`, {
  defaultMessage: 'Document details',
});

export const SEVERITY_TITLE = i18n.translate(`${TRANSLATION_NAMESPACE}.severityTitle`, {
  defaultMessage: 'Severity',
});

export const RISK_SCORE_TITLE = i18n.translate(`${TRANSLATION_NAMESPACE}.riskScoreTitle`, {
  defaultMessage: 'Risk score',
});

export const VIEW_RULE_TEXT = i18n.translate(
  'xpack.securitySolution.flyout.documentDetails.viewRuleText',
  {
    defaultMessage: 'View rule',
  }
);

/* Description section */

export const DESCRIPTION_TITLE = i18n.translate(`${TRANSLATION_NAMESPACE}.descriptionTitle`, {
  defaultMessage: 'Description',
});

export const RULE_DESCRIPTION_TITLE = i18n.translate(
  `${TRANSLATION_NAMESPACE}.ruleDescriptionTitle`,
  {
    defaultMessage: 'Rule description',
  }
);

export const DOCUMENT_DESCRIPTION_TITLE = i18n.translate(
  `${TRANSLATION_NAMESPACE}.documentDescriptionTitle`,
  {
    defaultMessage: 'Document description',
  }
);
export const DOCUMENT_DESCRIPTION_EXPAND_BUTTON = i18n.translate(
  `${TRANSLATION_NAMESPACE}.documentDescriptionExpandButton`,
  {
    defaultMessage: 'Expand',
  }
);
export const DOCUMENT_DESCRIPTION_COLLAPSE_BUTTON = i18n.translate(
  `${TRANSLATION_NAMESPACE}.documentDescriptionCollapseButton`,
  {
    defaultMessage: 'Collapse',
  }
);

export const ALERT_REASON_TITLE = i18n.translate(`${TRANSLATION_NAMESPACE}.alertReasonTitle`, {
  defaultMessage: 'Alert reason',
});

export const DOCUMENT_REASON_TITLE = i18n.translate(
  `${TRANSLATION_NAMESPACE}.documentReasonTitle`,
  {
    defaultMessage: 'Document reason',
  }
);

/* Investigation section */

export const INVESTIGATION_TITLE = i18n.translate(
  `${TRANSLATION_NAMESPACE}.investigationSectionTitle`,
  {
    defaultMessage: 'Investigation',
  }
);

export const HIGHLIGHTED_FIELDS_TITLE = i18n.translate(
  `${TRANSLATION_NAMESPACE}.highlightedFieldsTitle`,
  { defaultMessage: 'Highlighted fields' }
);

/* Insights section */

export const ENTITIES_TITLE = i18n.translate(`${TRANSLATION_NAMESPACE}.entitiesTitle`, {
  defaultMessage: 'Entities',
});

export const THREAT_INTELLIGENCE_TITLE = i18n.translate(
  `${TRANSLATION_NAMESPACE}.threatIntelligenceTitle`,
  { defaultMessage: 'Threat Intelligence' }
);

export const INSIGHTS_TITLE = i18n.translate(`${TRANSLATION_NAMESPACE}.insightsTitle`, {
  defaultMessage: 'Insights',
});

export const CORRELATIONS_TITLE = i18n.translate(`${TRANSLATION_NAMESPACE}.correlationsTitle`, {
  defaultMessage: 'Correlations',
});

export const PREVALENCE_TITLE = i18n.translate(`${TRANSLATION_NAMESPACE}.prevalenceTitle`, {
  defaultMessage: 'Prevalence',
});

export const TECHNICAL_PREVIEW_TITLE = i18n.translate(
  `${TRANSLATION_NAMESPACE}.technicalPreviewTitle`,
  { defaultMessage: 'Technical Preview' }
);

export const TECHNICAL_PREVIEW_MESSAGE = i18n.translate(
  `${TRANSLATION_NAMESPACE}.technicalPreviewMessage`,
  {
    defaultMessage:
      'This functionality is in technical preview and may be changed or removed completely in a future release. Elastic will take a best effort approach to fix any issues, but features in technical preview are not subject to the support SLA of official GA features.',
  }
);

export const ENTITIES_TEXT = i18n.translate(`${TRANSLATION_NAMESPACE}.overviewTab.entitiesText`, {
  defaultMessage: 'entities',
});

export const THREAT_INTELLIGENCE_TEXT = i18n.translate(
  `${TRANSLATION_NAMESPACE}.overviewTab.threatIntelligenceText`,
  {
    defaultMessage: 'fields of threat intelligence',
  }
);

export const THREAT_MATCH_DETECTED = i18n.translate(
  `${TRANSLATION_NAMESPACE}.overviewTab.threatIntelligence.threatMatch`,
  {
    defaultMessage: `threat match detected`,
  }
);

export const THREAT_MATCHES_DETECTED = i18n.translate(
  `${TRANSLATION_NAMESPACE}.overviewTab.threatIntelligence.threatMatches`,
  {
    defaultMessage: `threat matches detected`,
  }
);

export const THREAT_ENRICHMENT = i18n.translate(
  `${TRANSLATION_NAMESPACE}.overviewTab.threatIntelligence.threatEnrichment`,
  {
    defaultMessage: `field enriched with threat intelligence`,
  }
);

export const THREAT_ENRICHMENTS = i18n.translate(
  `${TRANSLATION_NAMESPACE}.overviewTab.threatIntelligence.threatEnrichments`,
  {
    defaultMessage: `fields enriched with threat intelligence`,
  }
);

export const CORRELATIONS_TEXT = i18n.translate(
  `${TRANSLATION_NAMESPACE}.overviewTab.correlationsText`,
  {
    defaultMessage: 'fields of correlation',
  }
);

export const CORRELATIONS_ANCESTRY_ALERT = i18n.translate(
  `${TRANSLATION_NAMESPACE}.overviewTab.correlations.ancestryAlert`,
  {
    defaultMessage: 'alert related by ancestry',
  }
);

export const CORRELATIONS_ANCESTRY_ALERTS = i18n.translate(
  `${TRANSLATION_NAMESPACE}.overviewTab.correlations.ancestryAlerts`,
  {
    defaultMessage: 'alerts related by ancestry',
  }
);
export const CORRELATIONS_SAME_SOURCE_EVENT_ALERT = i18n.translate(
  `${TRANSLATION_NAMESPACE}.overviewTab.correlations.sameSourceEventAlert`,
  {
    defaultMessage: 'alert related by the same source event',
  }
);

export const CORRELATIONS_SAME_SOURCE_EVENT_ALERTS = i18n.translate(
  `${TRANSLATION_NAMESPACE}.overviewTab.correlations.sameSourceEventAlerts`,
  {
    defaultMessage: 'alerts related by the same source event',
  }
);
export const CORRELATIONS_SAME_SESSION_ALERT = i18n.translate(
  `${TRANSLATION_NAMESPACE}.overviewTab.correlations.sameSessionAlert`,
  {
    defaultMessage: 'alert related by session',
  }
);

export const CORRELATIONS_SAME_SESSION_ALERTS = i18n.translate(
  `${TRANSLATION_NAMESPACE}.overviewTab.correlations.sameSessionAlerts`,
  {
    defaultMessage: 'alerts related by session',
  }
);
export const CORRELATIONS_RELATED_CASE = i18n.translate(
  `${TRANSLATION_NAMESPACE}.overviewTab.correlations.relatedCase`,
  {
    defaultMessage: 'related case',
  }
);

export const CORRELATIONS_RELATED_CASES = i18n.translate(
  `${TRANSLATION_NAMESPACE}.overviewTab.correlations.relatedCases`,
  {
    defaultMessage: 'related cases',
  }
);

export const PREVALENCE_TEXT = i18n.translate(
  `${TRANSLATION_NAMESPACE}.overviewTab.prevalenceText`,
  {
    defaultMessage: 'fields of prevalence',
  }
);

export const PREVALENCE_ROW_UNCOMMON = i18n.translate(
  `${TRANSLATION_NAMESPACE}.overviewTab.prevalenceRowText`,
  {
    defaultMessage: 'is uncommon',
  }
);

export const VIEW_ALL = (text: string) =>
  i18n.translate(`${TRANSLATION_NAMESPACE}.overviewTab.viewAllButton`, {
    values: { text },
    defaultMessage: 'View all {text}',
  });
export const VISUALIZATIONS_TITLE = i18n.translate(`${TRANSLATION_NAMESPACE}.visualizationsTitle`, {
  defaultMessage: 'Visualizations',
});

export const ANALYZER_PREVIEW_TITLE = i18n.translate(
  `${TRANSLATION_NAMESPACE}.analyzerPreviewTitle`,
  { defaultMessage: 'Analyzer preview' }
);

export const ANALYZER_PREVIEW_TEXT = i18n.translate(
  `${TRANSLATION_NAMESPACE}.analyzerPreviewText`,
  {
    defaultMessage: 'analyzer preview.',
  }
);

export const SHARE = i18n.translate(`${TRANSLATION_NAMESPACE}.share`, {
  defaultMessage: 'Share Alert',
});

export const INVESTIGATION_GUIDE_TITLE = i18n.translate(
  `${TRANSLATION_NAMESPACE}.investigationGuideText`,
  {
    defaultMessage: 'Investigation guide',
  }
);

export const SESSION_PREVIEW_TITLE = i18n.translate(
  `${TRANSLATION_NAMESPACE}.sessionPreview.title`,
  {
    defaultMessage: 'Session viewer preview',
  }
);
