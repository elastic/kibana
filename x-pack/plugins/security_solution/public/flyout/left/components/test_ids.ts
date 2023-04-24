/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const PREFIX = 'securitySolution' as const;

export const ANALYZER_GRAPH_TEST_ID = `${PREFIX}DocumentDetailsFlyoutAnalyzerGraph` as const;
export const ANALYZE_GRAPH_ERROR_TEST_ID = `${PREFIX}DocumentDetailsFlyoutAnalyzerGraphError`;
export const SESSION_VIEW_TEST_ID = `${PREFIX}DocumentDetailsFlyoutSessionView` as const;
export const SESSION_VIEW_ERROR_TEST_ID = `${PREFIX}DocumentDetailsFlyoutSessionViewError` as const;
export const ENTITIES_DETAILS_TEST_ID = `${PREFIX}DocumentDetailsFlyoutEntitiesDetails` as const;
export const THREAT_INTELLIGENCE_DETAILS_TEST_ID =
  `${PREFIX}DocumentDetailsFlyoutThreatIntelligenceDetails` as const;
export const PREVALENCE_DETAILS_TEST_ID =
  `${PREFIX}DocumentDetailsFlyoutPrevalenceDetails` as const;
export const CORRELATIONS_DETAILS_TEST_ID =
  `${PREFIX}DocumentDetailsFlyoutCorrelationsDetails` as const;

export const THREAT_INTELLIGENCE_DETAILS_ENRICHMENTS_TEST_ID = `threat-match-detected` as const;
export const THREAT_INTELLIGENCE_DETAILS_SPINNER_TEST_ID =
  `${PREFIX}ThreatIntelligenceDetailsLoadingSpinner` as const;
