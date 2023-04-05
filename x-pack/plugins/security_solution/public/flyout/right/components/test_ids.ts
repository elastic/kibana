/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CONTENT_TEST_ID, HEADER_TEST_ID } from './expandable_section';

/* Header */

export const FLYOUT_HEADER_TITLE_TEST_ID = 'securitySolutionDocumentDetailsFlyoutHeaderTitle';
export const EXPAND_DETAILS_BUTTON_TEST_ID =
  'securitySolutionDocumentDetailsFlyoutHeaderExpandDetailButton';
export const COLLAPSE_DETAILS_BUTTON_TEST_ID =
  'securitySolutionDocumentDetailsFlyoutHeaderCollapseDetailButton';
export const FLYOUT_HEADER_SEVERITY_TITLE_TEST_ID =
  'securitySolutionAlertDetailsFlyoutHeaderSeverityTitle';
export const FLYOUT_HEADER_SEVERITY_VALUE_TEST_ID = 'severity';
export const FLYOUT_HEADER_RISK_SCORE_TITLE_TEST_ID =
  'securitySolutionAlertDetailsFlyoutHeaderRiskScoreTitle';
export const FLYOUT_HEADER_RISK_SCORE_VALUE_TEST_ID =
  'securitySolutionAlertDetailsFlyoutHeaderRiskScoreValue';

/* Description section */

export const DESCRIPTION_SECTION_TEST_ID =
  'securitySolutionDocumentDetailsFlyoutDescriptionSection';
export const DESCRIPTION_SECTION_HEADER_TEST_ID = DESCRIPTION_SECTION_TEST_ID + HEADER_TEST_ID;
export const DESCRIPTION_SECTION_CONTENT_TEST_ID = DESCRIPTION_SECTION_TEST_ID + CONTENT_TEST_ID;
export const DESCRIPTION_TITLE_TEST_ID = 'securitySolutionDocumentDetailsFlyoutDescriptionTitle';
export const DESCRIPTION_DETAILS_TEST_ID =
  'securitySolutionDocumentDetailsFlyoutDescriptionDetails';
export const DESCRIPTION_EXPAND_BUTTON_TEST_ID =
  'securitySolutionDocumentDetailsFlyoutDescriptionExpandButton';
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
export const HIGHLIGHTED_FIELDS_TEST_ID = 'securitySolutionDocumentDetailsFlyoutHighlightedFields';
export const HIGHLIGHTED_FIELDS_HEADER_EXPAND_ICON_TEST_ID = 'query-toggle-header';
export const HIGHLIGHTED_FIELDS_GO_TO_TABLE_LINK = 'summary-view-go-to-table-link';
