/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { ConnectorTypes } from './api';

export const DEFAULT_DATE_FORMAT = 'dateFormat';
export const DEFAULT_DATE_FORMAT_TZ = 'dateFormat:tz';

export const APP_ID = 'cases';

export const CASE_SAVED_OBJECT = 'cases';
export const CASE_CONNECTOR_MAPPINGS_SAVED_OBJECT = 'cases-connector-mappings';
export const SUB_CASE_SAVED_OBJECT = 'cases-sub-case';
export const CASE_USER_ACTION_SAVED_OBJECT = 'cases-user-actions';
export const CASE_COMMENT_SAVED_OBJECT = 'cases-comments';
export const CASE_CONFIGURE_SAVED_OBJECT = 'cases-configure';

/**
 * If more values are added here please also add them here: x-pack/test/case_api_integration/common/fixtures/plugins
 */
export const SAVED_OBJECT_TYPES = [
  CASE_SAVED_OBJECT,
  CASE_CONNECTOR_MAPPINGS_SAVED_OBJECT,
  CASE_USER_ACTION_SAVED_OBJECT,
  CASE_COMMENT_SAVED_OBJECT,
  CASE_CONFIGURE_SAVED_OBJECT,
];

/**
 * Case routes
 */

export const CASES_URL = '/api/cases';
export const CASE_DETAILS_URL = `${CASES_URL}/{case_id}`;
export const CASE_CONFIGURE_URL = `${CASES_URL}/configure`;
export const CASE_CONFIGURE_DETAILS_URL = `${CASES_URL}/configure/{configuration_id}`;
export const CASE_CONFIGURE_CONNECTORS_URL = `${CASE_CONFIGURE_URL}/connectors`;

export const SUB_CASES_PATCH_DEL_URL = `${CASES_URL}/sub_cases`;
export const SUB_CASES_URL = `${CASE_DETAILS_URL}/sub_cases`;
export const SUB_CASE_DETAILS_URL = `${CASE_DETAILS_URL}/sub_cases/{sub_case_id}`;
export const SUB_CASE_USER_ACTIONS_URL = `${SUB_CASE_DETAILS_URL}/user_actions`;

export const CASE_COMMENTS_URL = `${CASE_DETAILS_URL}/comments`;
export const CASE_COMMENT_DETAILS_URL = `${CASE_DETAILS_URL}/comments/{comment_id}`;
export const CASE_PUSH_URL = `${CASE_DETAILS_URL}/connector/{connector_id}/_push`;
export const CASE_REPORTERS_URL = `${CASES_URL}/reporters`;
export const CASE_STATUS_URL = `${CASES_URL}/status`;
export const CASE_TAGS_URL = `${CASES_URL}/tags`;
export const CASE_USER_ACTIONS_URL = `${CASE_DETAILS_URL}/user_actions`;

export const CASE_ALERTS_URL = `${CASES_URL}/alerts/{alert_id}`;
export const CASE_DETAILS_ALERTS_URL = `${CASE_DETAILS_URL}/alerts`;

/**
 * Action routes
 */

export const ACTION_URL = '/api/actions';
export const ACTION_TYPES_URL = `${ACTION_URL}/connector_types`;
export const CONNECTORS_URL = `${ACTION_URL}/connectors`;

export const SUPPORTED_CONNECTORS = [
  `${ConnectorTypes.serviceNowITSM}`,
  `${ConnectorTypes.serviceNowSIR}`,
  `${ConnectorTypes.jira}`,
  `${ConnectorTypes.resilient}`,
  `${ConnectorTypes.swimlane}`,
];

/**
 * Alerts
 */
export const MAX_ALERTS_PER_SUB_CASE = 5000;
export const MAX_GENERATED_ALERTS_PER_SUB_CASE = 50;

/**
 * This must be the same value that the security solution plugin uses to define the case kind when it registers the
 * feature for the 7.13 migration only.
 *
 * This variable is being also used by test files and mocks.
 */
export const SECURITY_SOLUTION_OWNER = 'securitySolution';

/**
 * This flag governs enabling the case as a connector feature. It is disabled by default as the feature is not complete.
 */
export const ENABLE_CASE_CONNECTOR = false;

if (ENABLE_CASE_CONNECTOR) {
  SAVED_OBJECT_TYPES.push(SUB_CASE_SAVED_OBJECT);
}

export const MAX_DOCS_PER_PAGE = 10000;
export const MAX_CONCURRENT_SEARCHES = 10;

/**
 * Validation
 */

export const MAX_TITLE_LENGTH = 64;
