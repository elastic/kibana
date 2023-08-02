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

/* Insights section*/

export const INSIGHTS_TEST_ID = 'securitySolutionDocumentDetailsFlyoutInsights';
export const INSIGHTS_HEADER_TEST_ID = 'securitySolutionDocumentDetailsFlyoutInsightsHeader';
export const ENTITIES_HEADER_TEST_ID = 'securitySolutionDocumentDetailsFlyoutEntitiesHeader';
export const ENTITIES_CONTENT_TEST_ID = 'securitySolutionDocumentDetailsFlyoutEntitiesContent';
export const ENTITIES_USER_CONTENT_TEST_ID =
  'securitySolutionDocumentDetailsFlyoutEntitiesUserContent';
export const ENTITIES_HOST_CONTENT_TEST_ID =
  'securitySolutionDocumentDetailsFlyoutEntitiesHostContent';
export const ENTITY_PANEL_TOGGLE_BUTTON_TEST_ID =
  'securitySolutionDocumentDetailsFlyoutEntityPanelToggleButton';
export const ENTITY_PANEL_HEADER_TEST_ID = 'securitySolutionDocumentDetailsFlyoutEntityPanelHeader';
export const ENTITY_PANEL_HEADER_LEFT_SECTION_TEST_ID =
  'securitySolutionDocumentDetailsFlyoutEntityPanelHeaderLeftSection';
export const ENTITY_PANEL_HEADER_RIGHT_SECTION_TEST_ID =
  'securitySolutionDocumentDetailsFlyoutEntityPanelHeaderRightSection';
export const ENTITY_PANEL_CONTENT_TEST_ID =
  'securitySolutionDocumentDetailsFlyoutEntityPanelContent';
export const TECHNICAL_PREVIEW_ICON_TEST_ID =
  'securitySolutionDocumentDetailsFlyoutTechnicalPreviewIcon';
export const ENTITIES_USER_OVERVIEW_TEST_ID =
  'securitySolutionDocumentDetailsFlyoutEntitiesUserOverview';
export const ENTITIES_USER_OVERVIEW_IP_TEST_ID =
  'securitySolutionDocumentDetailsFlyoutEntitiesUserOverviewIP';
export const ENTITIES_USER_OVERVIEW_RISK_LEVEL_TEST_ID =
  'securitySolutionDocumentDetailsFlyoutEntitiesUserOverviewRiskLevel';
export const ENTITIES_HOST_OVERVIEW_TEST_ID =
  'securitySolutionDocumentDetailsFlyoutEntitiesHostOverview';
export const ENTITIES_HOST_OVERVIEW_IP_TEST_ID =
  'securitySolutionDocumentDetailsFlyoutEntitiesHostOverviewIP';
export const ENTITIES_HOST_OVERVIEW_RISK_LEVEL_TEST_ID =
  'securitySolutionDocumentDetailsFlyoutEntitiesHostOverviewRiskLevel';

/* Insights Threat Intelligence */

export const INSIGHTS_THREAT_INTELLIGENCE_TEST_ID =
  'securitySolutionDocumentDetailsFlyoutInsightsThreatIntelligence';
export const INSIGHTS_THREAT_INTELLIGENCE_TITLE_TEST_ID = `${INSIGHTS_THREAT_INTELLIGENCE_TEST_ID}Title`;
export const INSIGHTS_THREAT_INTELLIGENCE_CONTENT_TEST_ID = `${INSIGHTS_THREAT_INTELLIGENCE_TEST_ID}Content`;
export const INSIGHTS_THREAT_INTELLIGENCE_VIEW_ALL_BUTTON_TEST_ID = `${INSIGHTS_THREAT_INTELLIGENCE_TEST_ID}ViewAllButton`;
export const INSIGHTS_THREAT_INTELLIGENCE_LOADING_TEST_ID = `${INSIGHTS_THREAT_INTELLIGENCE_TEST_ID}Loading`;
export const INSIGHTS_THREAT_INTELLIGENCE_VALUE_TEST_ID = `${INSIGHTS_THREAT_INTELLIGENCE_TEST_ID}Value`;

/* Insights Correlations */

export const INSIGHTS_CORRELATIONS_TEST_ID =
  'securitySolutionDocumentDetailsFlyoutInsightsCorrelations';
export const INSIGHTS_CORRELATIONS_TITLE_TEST_ID = `${INSIGHTS_CORRELATIONS_TEST_ID}Title`;
export const INSIGHTS_CORRELATIONS_CONTENT_TEST_ID = `${INSIGHTS_CORRELATIONS_TEST_ID}Content`;
export const INSIGHTS_CORRELATIONS_VIEW_ALL_BUTTON_TEST_ID = `${INSIGHTS_CORRELATIONS_TEST_ID}ViewAllButton`;
export const INSIGHTS_CORRELATIONS_LOADING_TEST_ID = `${INSIGHTS_CORRELATIONS_TEST_ID}Loading`;
export const INSIGHTS_CORRELATIONS_VALUE_TEST_ID = `${INSIGHTS_CORRELATIONS_TEST_ID}Value`;

/* Insights Prevalence */

export const INSIGHTS_PREVALENCE_TEST_ID =
  'securitySolutionDocumentDetailsFlyoutInsightsPrevalence';
export const INSIGHTS_PREVALENCE_TITLE_TEST_ID = `${INSIGHTS_PREVALENCE_TEST_ID}Title`;
export const INSIGHTS_PREVALENCE_CONTENT_TEST_ID = `${INSIGHTS_PREVALENCE_TEST_ID}Content`;
export const INSIGHTS_PREVALENCE_VIEW_ALL_BUTTON_TEST_ID = `${INSIGHTS_PREVALENCE_TEST_ID}ViewAllButton`;
export const INSIGHTS_PREVALENCE_VALUE_TEST_ID = `${INSIGHTS_PREVALENCE_TEST_ID}Value`;

/* Visualizations section */

export const VISUALIZATIONS_SECTION_TEST_ID = 'securitySolutionDocumentDetailsVisualizationsTitle';
export const VISUALIZATIONS_SECTION_HEADER_TEST_ID =
  'securitySolutionDocumentDetailsVisualizationsTitleHeader';
export const ANALYZER_PREVIEW_TEST_ID = 'securitySolutionDocumentDetailsAnalayzerPreview';
export const ANALYZER_TREE_TEST_ID = 'securitySolutionDocumentDetailsAnalayzerTree';
export const ANALYZER_TREE_VIEW_DETAILS_BUTTON_TEST_ID =
  'securitySolutionDocumentDetailsAnalayzerTreeViewDetailsButton';
export const ANALYZER_TREE_LOADING_TEST_ID = 'securitySolutionDocumentDetailsAnalayzerTreeLoading';
export const ANALYZER_TREE_ERROR_TEST_ID = 'securitySolutionDocumentDetailsAnalayzerTreeError';
export const SESSION_PREVIEW_TEST_ID = 'securitySolutionDocumentDetailsSessionPreview';
export const SESSION_PREVIEW_VIEW_DETAILS_BUTTON_TEST_ID =
  'securitySolutionDocumentDetailsSessionPreviewViewDetailsButton';

/* Response section */

export const RESPONSE_SECTION_TEST_ID = 'securitySolutionDocumentDetailsFlyoutResponseSection';
export const RESPONSE_BUTTON_TEST_ID = 'securitySolutionDocumentDetailsFlyoutResponseButton';
export const RESPONSE_EMPTY_TEST_ID = `${RESPONSE_BASE_TEST_ID}Empty` as const;
