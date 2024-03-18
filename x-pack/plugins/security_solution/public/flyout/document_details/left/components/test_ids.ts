/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PREFIX } from '../../../shared/test_ids';

/* Visualization tab */

export const ANALYZER_GRAPH_TEST_ID = `${PREFIX}AnalyzerGraph` as const;
export const SESSION_VIEW_TEST_ID = `${PREFIX}SessionView` as const;

/* Insights tab */

/* Prevalence */

const PREVALENCE_DETAILS_TEST_ID = `${PREFIX}PrevalenceDetails` as const;
export const PREVALENCE_DETAILS_DATE_PICKER_TEST_ID =
  `${PREVALENCE_DETAILS_TEST_ID}DatePicker` as const;
export const PREVALENCE_DETAILS_UPSELL_TEST_ID = `${PREVALENCE_DETAILS_TEST_ID}Upsell` as const;
export const PREVALENCE_DETAILS_TABLE_TEST_ID = `${PREVALENCE_DETAILS_TEST_ID}Table` as const;
export const PREVALENCE_DETAILS_TABLE_FIELD_CELL_TEST_ID =
  `${PREVALENCE_DETAILS_TABLE_TEST_ID}FieldCell` as const;
export const PREVALENCE_DETAILS_TABLE_VALUE_CELL_TEST_ID =
  `${PREVALENCE_DETAILS_TABLE_TEST_ID}ValueCell` as const;
export const PREVALENCE_DETAILS_TABLE_ALERT_COUNT_CELL_TEST_ID =
  `${PREVALENCE_DETAILS_TABLE_TEST_ID}AlertCountCell` as const;
export const PREVALENCE_DETAILS_TABLE_DOC_COUNT_CELL_TEST_ID =
  `${PREVALENCE_DETAILS_TABLE_TEST_ID}DocCountCell` as const;
export const PREVALENCE_DETAILS_TABLE_HOST_PREVALENCE_CELL_TEST_ID =
  `${PREVALENCE_DETAILS_TABLE_TEST_ID}HostPrevalenceCell` as const;
export const PREVALENCE_DETAILS_TABLE_USER_PREVALENCE_CELL_TEST_ID =
  `${PREVALENCE_DETAILS_TABLE_TEST_ID}UserPrevalenceCell` as const;
export const PREVALENCE_DETAILS_TABLE_UPSELL_CELL_TEST_ID =
  `${PREVALENCE_DETAILS_TABLE_TEST_ID}UpsellCell` as const;

/* Entities */

export const ENTITIES_DETAILS_TEST_ID = `${PREFIX}EntitiesDetails` as const;
export const USER_DETAILS_TEST_ID = `${PREFIX}UsersDetails` as const;
export const USER_DETAILS_RELATED_HOSTS_TABLE_TEST_ID =
  `${USER_DETAILS_TEST_ID}RelatedHostsTable` as const;
export const USER_DETAILS_INFO_TEST_ID = 'user-overview' as const;
export const HOST_DETAILS_TEST_ID = `${PREFIX}HostsDetails` as const;
export const HOST_DETAILS_RELATED_USERS_TABLE_TEST_ID =
  `${HOST_DETAILS_TEST_ID}RelatedUsersTable` as const;
export const HOST_DETAILS_INFO_TEST_ID = 'host-overview' as const;

/* Threat Intelligence */

export const THREAT_INTELLIGENCE_DETAILS_ENRICHMENTS_TEST_ID = `threat-match-detected` as const;
export const THREAT_INTELLIGENCE_DETAILS_LOADING_TEST_ID =
  `${PREFIX}ThreatIntelligenceDetailsLoading` as const;

/* Correlations */

export const CORRELATIONS_DETAILS_TEST_ID = `${PREFIX}CorrelationsDetails` as const;

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
export const CORRELATIONS_DETAILS_SUPPRESSED_ALERTS_SECTION_TEST_ID =
  `${CORRELATIONS_DETAILS_TEST_ID}SuppressedAlertsSection` as const;
export const SUPPRESSED_ALERTS_SECTION_TECHNICAL_PREVIEW_TEST_ID =
  `${CORRELATIONS_DETAILS_TEST_ID}SuppressedAlertsSectionTechnicalPreview` as const;

/* Response */

const RESPONSE_TEST_ID = `${PREFIX}Response` as const;
export const RESPONSE_DETAILS_TEST_ID = `${RESPONSE_TEST_ID}Details` as const;
export const RESPONSE_NO_DATA_TEST_ID = `${RESPONSE_TEST_ID}NoData` as const;

/* Investigation */

export const INVESTIGATION_GUIDE_TEST_ID = `${PREFIX}InvestigationGuide` as const;
export const INVESTIGATION_GUIDE_LOADING_TEST_ID = `${INVESTIGATION_GUIDE_TEST_ID}Loading` as const;
