/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* Visualization tab */

const PREFIX = 'securitySolutionDocumentDetailsFlyout' as const;

export const ANALYZER_GRAPH_TEST_ID = `${PREFIX}AnalyzerGraph` as const;
export const ANALYZE_GRAPH_ERROR_TEST_ID = `${PREFIX}AnalyzerGraphError` as const;
export const SESSION_VIEW_TEST_ID = `${PREFIX}SessionView` as const;
export const SESSION_VIEW_ERROR_TEST_ID = `${PREFIX}SessionViewError` as const;

/* Insights tab */

/* Prevalence */

export const PREVALENCE_DETAILS_DATE_PICKER_TEST_ID =
  `${PREFIX}PrevalenceDetailsDatePicker` as const;
export const PREVALENCE_DETAILS_TABLE_TEST_ID = `${PREFIX}PrevalenceDetailsTable` as const;
export const PREVALENCE_DETAILS_LOADING_TEST_ID = `${PREFIX}PrevalenceDetailsLoading` as const;
export const PREVALENCE_DETAILS_TABLE_FIELD_CELL_TEST_ID =
  `${PREFIX}PrevalenceDetailsTableFieldCell` as const;
export const PREVALENCE_DETAILS_TABLE_VALUE_CELL_TEST_ID =
  `${PREFIX}PrevalenceDetailsTableValueCell` as const;
export const PREVALENCE_DETAILS_TABLE_ALERT_COUNT_CELL_TEST_ID =
  `${PREFIX}PrevalenceDetailsTableAlertCountCell` as const;
export const PREVALENCE_DETAILS_TABLE_DOC_COUNT_CELL_TEST_ID =
  `${PREFIX}PrevalenceDetailsTableDocCountCell` as const;
export const PREVALENCE_DETAILS_TABLE_HOST_PREVALENCE_CELL_TEST_ID =
  `${PREFIX}PrevalenceDetailsTableHostPrevalenceCell` as const;
export const PREVALENCE_DETAILS_TABLE_USER_PREVALENCE_CELL_TEST_ID =
  `${PREFIX}PrevalenceDetailsTableUserPrevalenceCell` as const;
export const PREVALENCE_DETAILS_TABLE_ERROR_TEST_ID =
  `${PREFIX}PrevalenceDetailsTableError` as const;
export const PREVALENCE_DETAILS_TABLE_NO_DATA_TEST_ID =
  `${PREFIX}PrevalenceDetailsTableNoData` as const;

/* Entities */

export const ENTITIES_DETAILS_TEST_ID = `${PREFIX}EntitiesDetails` as const;
export const USER_DETAILS_TEST_ID = `${PREFIX}UsersDetails` as const;
export const USER_DETAILS_INFO_TEST_ID = 'user-overview';
export const USER_DETAILS_RELATED_HOSTS_TABLE_TEST_ID =
  `${PREFIX}UsersDetailsRelatedHostsTable` as const;
export const HOST_DETAILS_TEST_ID = `${PREFIX}HostsDetails` as const;
export const HOST_DETAILS_INFO_TEST_ID = 'host-overview';
export const HOST_DETAILS_RELATED_USERS_TABLE_TEST_ID =
  `${PREFIX}HostsDetailsRelatedUsersTable` as const;

export const CORRELATIONS_DETAILS_TEST_ID = `${PREFIX}CorrelationsDetails` as const;

export const THREAT_INTELLIGENCE_DETAILS_ENRICHMENTS_TEST_ID = `threat-match-detected` as const;
export const THREAT_INTELLIGENCE_DETAILS_SPINNER_TEST_ID =
  `${PREFIX}ThreatIntelligenceDetailsLoadingSpinner` as const;

export const CORRELATIONS_DETAILS_BY_ANCESTRY_SECTION_TEST_ID =
  `${CORRELATIONS_DETAILS_TEST_ID}AlertsByAncestrySection` as const;
export const CORRELATIONS_DETAILS_BY_ANCESTRY_SECTION_TABLE_TEST_ID =
  `${CORRELATIONS_DETAILS_BY_ANCESTRY_SECTION_TEST_ID}Table` as const;
export const CORRELATIONS_DETAILS_BY_SOURCE_SECTION_TEST_ID =
  `${CORRELATIONS_DETAILS_TEST_ID}AlertsBySourceSection` as const;
export const CORRELATIONS_DETAILS_BY_SOURCE_SECTION_TABLE_TEST_ID =
  `${CORRELATIONS_DETAILS_BY_SOURCE_SECTION_TEST_ID}Table` as const;
export const CORRELATIONS_DETAILS_BY_SESSION_SECTION_TEST_ID =
  `${CORRELATIONS_DETAILS_TEST_ID}AlertsBySessionSection` as const;
export const CORRELATIONS_DETAILS_BY_SESSION_SECTION_TABLE_TEST_ID =
  `${CORRELATIONS_DETAILS_BY_SESSION_SECTION_TEST_ID}Table` as const;
export const CORRELATIONS_DETAILS_CASES_SECTION_TEST_ID =
  `${CORRELATIONS_DETAILS_TEST_ID}CasesSection` as const;
export const CORRELATIONS_DETAILS_CASES_SECTION_TABLE_TEST_ID =
  `${CORRELATIONS_DETAILS_CASES_SECTION_TEST_ID}Table` as const;
export const RESPONSE_BASE_TEST_ID = `${PREFIX}Responses` as const;
export const RESPONSE_DETAILS_TEST_ID = `${RESPONSE_BASE_TEST_ID}Details` as const;
export const RESPONSE_EMPTY_TEST_ID = `${RESPONSE_BASE_TEST_ID}Empty` as const;

export const INVESTIGATION_GUIDE_LOADING_TEST_ID = `${PREFIX}InvestigationGuideLoading`;
export const INVESTIGATION_GUIDE_NO_DATA_TEST_ID = `${PREFIX}NoData`;
