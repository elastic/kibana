/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RESPONSE_BASE_TEST_ID } from '../../left/components/test_ids';
import { CONTENT_TEST_ID, HEADER_TEST_ID } from './expandable_section';

/* Header */

export const FLYOUT_HEADER_TITLE_TEST_ID = 'securitySolutionDocumentDetailsFlyoutHeaderTitle';
export const EXPAND_DETAILS_BUTTON_TEST_ID =
  'securitySolutionDocumentDetailsFlyoutHeaderExpandDetailButton';
export const COLLAPSE_DETAILS_BUTTON_TEST_ID =
  'securitySolutionDocumentDetailsFlyoutHeaderCollapseDetailButton';
export const FLYOUT_HEADER_STATUS_BUTTON_TEST_ID = 'rule-status-badge';
export const FLYOUT_HEADER_SEVERITY_TITLE_TEST_ID =
  'securitySolutionAlertDetailsFlyoutHeaderSeverityTitle';
export const FLYOUT_HEADER_SEVERITY_VALUE_TEST_ID = 'severity';
export const FLYOUT_HEADER_RISK_SCORE_TITLE_TEST_ID =
  'securitySolutionAlertDetailsFlyoutHeaderRiskScoreTitle';
export const FLYOUT_HEADER_RISK_SCORE_VALUE_TEST_ID =
  'securitySolutionAlertDetailsFlyoutHeaderRiskScoreValue';
export const FLYOUT_HEADER_SHARE_BUTTON_TEST_ID =
  'securitySolutionAlertDetailsFlyoutHeaderShareButton';
export const FLYOUT_HEADER_CHAT_BUTTON_TEST_ID = 'newChatById';

/* About section */

export const ABOUT_SECTION_TEST_ID = 'securitySolutionDocumentDetailsFlyoutAboutSection';
export const ABOUT_SECTION_HEADER_TEST_ID = ABOUT_SECTION_TEST_ID + HEADER_TEST_ID;
export const ABOUT_SECTION_CONTENT_TEST_ID = ABOUT_SECTION_TEST_ID + CONTENT_TEST_ID;
export const RULE_SUMMARY_BUTTON_TEST_ID = 'securitySolutionDocumentDetailsFlyoutRuleSummaryButton';
export const DESCRIPTION_TITLE_TEST_ID = 'securitySolutionDocumentDetailsFlyoutDescriptionTitle';
export const DESCRIPTION_DETAILS_TEST_ID =
  'securitySolutionDocumentDetailsFlyoutDescriptionDetails';
export const REASON_TITLE_TEST_ID = 'securitySolutionDocumentDetailsFlyoutReasonTitle';
export const REASON_DETAILS_TEST_ID = 'securitySolutionDocumentDetailsFlyoutReasonDetails';
export const REASON_DETAILS_PREVIEW_BUTTON_TEST_ID =
  'securitySolutionDocumentDetailsFlyoutReasonDetailsPreviewButton';
export const MITRE_ATTACK_TITLE_TEST_ID = 'securitySolutionAlertDetailsFlyoutMitreAttackTitle';
export const MITRE_ATTACK_DETAILS_TEST_ID = 'securitySolutionAlertDetailsFlyoutMitreAttackDetails';

/* Investigation section */

export const INVESTIGATION_SECTION_TEST_ID =
  'securitySolutionDocumentDetailsFlyoutInvestigationSection';
export const INVESTIGATION_SECTION_HEADER_TEST_ID = INVESTIGATION_SECTION_TEST_ID + HEADER_TEST_ID;
export const INVESTIGATION_SECTION_CONTENT_TEST_ID =
  INVESTIGATION_SECTION_TEST_ID + CONTENT_TEST_ID;
export const HIGHLIGHTED_FIELDS_TITLE_TEST_ID =
  'securitySolutionDocumentDetailsFlyoutHighlightedFieldsTitle';
export const HIGHLIGHTED_FIELDS_DETAILS_TEST_ID =
  'securitySolutionDocumentDetailsFlyoutHighlightedFieldsDetails';
export const HIGHLIGHTED_FIELDS_CELL_TEST_ID =
  'securitySolutionDocumentDetailsFlyoutHighlightedFieldsCell';
export const HIGHLIGHTED_FIELDS_BASIC_CELL_TEST_ID =
  'securitySolutionDocumentDetailsFlyoutHighlightedFieldsBasicCell';
export const HIGHLIGHTED_FIELDS_LINKED_CELL_TEST_ID =
  'securitySolutionDocumentDetailsFlyoutHighlightedFieldsLinkedCell';
export const HIGHLIGHTED_FIELDS_AGENT_STATUS_CELL_TEST_ID =
  'securitySolutionDocumentDetailsFlyoutHighlightedFieldsAgentStatusCell';

export const INVESTIGATION_GUIDE_BUTTON_TEST_ID =
  'securitySolutionDocumentDetailsFlyoutInvestigationGuideButton';

/* Insights section */

export const INSIGHTS_TEST_ID = 'securitySolutionDocumentDetailsFlyoutInsights';
export const INSIGHTS_HEADER_TEST_ID = `${INSIGHTS_TEST_ID}Header`;

/* Summary row */

export const SUMMARY_ROW_LOADING_TEST_ID = (dataTestSubj: string) => `${dataTestSubj}Loading`;
export const SUMMARY_ROW_ICON_TEST_ID = (dataTestSubj: string) => `${dataTestSubj}Icon`;
export const SUMMARY_ROW_VALUE_TEST_ID = (dataTestSubj: string) => `${dataTestSubj}Value`;

/* Insights Entities */

export const INSIGHTS_ENTITIES_TEST_ID = 'securitySolutionDocumentDetailsFlyoutInsightsEntities';
export const TECHNICAL_PREVIEW_ICON_TEST_ID =
  'securitySolutionDocumentDetailsFlyoutTechnicalPreviewIcon';
export const ENTITIES_USER_OVERVIEW_TEST_ID =
  'securitySolutionDocumentDetailsFlyoutEntitiesUserOverview';
export const ENTITIES_USER_OVERVIEW_LINK_TEST_ID = `${ENTITIES_USER_OVERVIEW_TEST_ID}Link`;
export const ENTITIES_USER_OVERVIEW_DOMAIN_TEST_ID = `${ENTITIES_USER_OVERVIEW_TEST_ID}Domain`;
export const ENTITIES_USER_OVERVIEW_LAST_SEEN_TEST_ID = `${ENTITIES_USER_OVERVIEW_TEST_ID}LastSeen`;
export const ENTITIES_USER_OVERVIEW_RISK_LEVEL_TEST_ID = `${ENTITIES_USER_OVERVIEW_TEST_ID}RiskLevel`;
export const ENTITIES_HOST_OVERVIEW_TEST_ID =
  'securitySolutionDocumentDetailsFlyoutEntitiesHostOverview';
export const ENTITIES_HOST_OVERVIEW_LINK_TEST_ID = `${ENTITIES_HOST_OVERVIEW_TEST_ID}Link`;
export const ENTITIES_HOST_OVERVIEW_OS_FAMILY_TEST_ID = `${ENTITIES_HOST_OVERVIEW_TEST_ID}OsFamily`;
export const ENTITIES_HOST_OVERVIEW_LAST_SEEN_TEST_ID = `${ENTITIES_HOST_OVERVIEW_TEST_ID}LastSeen`;
export const ENTITIES_HOST_OVERVIEW_RISK_LEVEL_TEST_ID = `${ENTITIES_HOST_OVERVIEW_TEST_ID}RiskLevel`;

/* Insights Threat Intelligence */

export const INSIGHTS_THREAT_INTELLIGENCE_TEST_ID =
  'securitySolutionDocumentDetailsFlyoutInsightsThreatIntelligence';
export const INSIGHTS_THREAT_INTELLIGENCE_CONTAINER_TEST_ID = `${INSIGHTS_THREAT_INTELLIGENCE_TEST_ID}Container`;

/* Insights Correlations */

export const INSIGHTS_CORRELATIONS_TEST_ID =
  'securitySolutionDocumentDetailsFlyoutInsightsCorrelations';
export const INSIGHTS_CORRELATIONS_RELATED_CASES_TEST_ID =
  'securitySolutionDocumentDetailsFlyoutInsightsCorrelationsRelatedCases';
export const INSIGHTS_CORRELATIONS_RELATED_ALERTS_BY_SESSION_TEST_ID =
  'securitySolutionDocumentDetailsFlyoutInsightsCorrelationsRelatedAlertsBySession';
export const INSIGHTS_CORRELATIONS_RELATED_ALERTS_BY_SAME_SOURCE_EVENT_TEST_ID =
  'securitySolutionDocumentDetailsFlyoutInsightsCorrelationsRelatedAlertsBySameSourceEvent';
export const INSIGHTS_CORRELATIONS_RELATED_ALERTS_BY_ANCESTRY_TEST_ID =
  'securitySolutionDocumentDetailsFlyoutInsightsCorrelationsRelatedAlertsByAncestry';

/* Insights Prevalence */

export const INSIGHTS_PREVALENCE_TEST_ID =
  'securitySolutionDocumentDetailsFlyoutInsightsPrevalence';
export const INSIGHTS_PREVALENCE_ROW_TEST_ID =
  'securitySolutionDocumentDetailsFlyoutInsightsPrevalenceRow';

/* Visualizations section */

export const VISUALIZATIONS_SECTION_TEST_ID = 'securitySolutionDocumentDetailsVisualizationsTitle';
export const VISUALIZATIONS_SECTION_HEADER_TEST_ID =
  'securitySolutionDocumentDetailsVisualizationsTitleHeader';

/* Visualizations analyzer preview */

export const ANALYZER_PREVIEW_TEST_ID = 'securitySolutionDocumentDetailsAnalayzerPreview';

/* Visualizations session preview */

export const SESSION_PREVIEW_TEST_ID = 'securitySolutionDocumentDetailsSessionPreview';

/* Response section */

export const RESPONSE_SECTION_TEST_ID = 'securitySolutionDocumentDetailsFlyoutResponseSection';
export const RESPONSE_SECTION_HEADER_TEST_ID = RESPONSE_SECTION_TEST_ID + HEADER_TEST_ID;
export const RESPONSE_SECTION_CONTENT_TEST_ID = RESPONSE_SECTION_TEST_ID + CONTENT_TEST_ID;
export const RESPONSE_BUTTON_TEST_ID = 'securitySolutionDocumentDetailsFlyoutResponseButton';
export const RESPONSE_EMPTY_TEST_ID = `${RESPONSE_BASE_TEST_ID}Empty` as const;
