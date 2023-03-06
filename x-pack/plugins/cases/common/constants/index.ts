/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CasesFeaturesAllRequired } from '../ui/types';

export * from './owners';
export * from './files';
export * from './application';

export const DEFAULT_DATE_FORMAT = 'dateFormat' as const;
export const DEFAULT_DATE_FORMAT_TZ = 'dateFormat:tz' as const;

/**
 * Saved objects
 */

export const CASE_SAVED_OBJECT = 'cases' as const;
export const CASE_CONNECTOR_MAPPINGS_SAVED_OBJECT = 'cases-connector-mappings' as const;
export const CASE_USER_ACTION_SAVED_OBJECT = 'cases-user-actions' as const;
export const CASE_COMMENT_SAVED_OBJECT = 'cases-comments' as const;
export const CASE_CONFIGURE_SAVED_OBJECT = 'cases-configure' as const;

/**
 * If more values are added here please also add them here: x-pack/test/cases_api_integration/common/plugins
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

export const CASES_URL = '/api/cases' as const;
export const CASE_FIND_URL = `${CASES_URL}/_find` as const;
export const CASE_DETAILS_URL = `${CASES_URL}/{case_id}` as const;
export const CASE_CONFIGURE_URL = `${CASES_URL}/configure` as const;
export const CASE_CONFIGURE_DETAILS_URL = `${CASES_URL}/configure/{configuration_id}` as const;
export const CASE_CONFIGURE_CONNECTORS_URL = `${CASE_CONFIGURE_URL}/connectors` as const;

export const CASE_COMMENTS_URL = `${CASE_DETAILS_URL}/comments` as const;
export const CASE_COMMENT_DETAILS_URL = `${CASE_DETAILS_URL}/comments/{comment_id}` as const;
export const CASE_COMMENT_DELETE_URL = `${CASE_DETAILS_URL}/comments/{comment_id}` as const;
export const CASE_PUSH_URL = `${CASE_DETAILS_URL}/connector/{connector_id}/_push` as const;
export const CASE_REPORTERS_URL = `${CASES_URL}/reporters` as const;
export const CASE_STATUS_URL = `${CASES_URL}/status` as const;
export const CASE_TAGS_URL = `${CASES_URL}/tags` as const;
export const CASE_USER_ACTIONS_URL = `${CASE_DETAILS_URL}/user_actions` as const;
export const CASE_FIND_USER_ACTIONS_URL = `${CASE_USER_ACTIONS_URL}/_find` as const;

export const CASE_ALERTS_URL = `${CASES_URL}/alerts/{alert_id}` as const;
export const CASE_DETAILS_ALERTS_URL = `${CASE_DETAILS_URL}/alerts` as const;

export const CASE_METRICS_URL = `${CASES_URL}/metrics` as const;
export const CASE_METRICS_DETAILS_URL = `${CASES_URL}/metrics/{case_id}` as const;

/**
 * Internal routes
 */

export const CASES_INTERNAL_URL = '/internal/cases' as const;
export const INTERNAL_BULK_CREATE_ATTACHMENTS_URL =
  `${CASES_INTERNAL_URL}/{case_id}/attachments/_bulk_create` as const;
export const INTERNAL_BULK_GET_ATTACHMENTS_URL =
  `${CASES_INTERNAL_URL}/{case_id}/attachments/_bulk_get` as const;
export const INTERNAL_SUGGEST_USER_PROFILES_URL =
  `${CASES_INTERNAL_URL}/_suggest_user_profiles` as const;
export const INTERNAL_CONNECTORS_URL = `${CASES_INTERNAL_URL}/{case_id}/_connectors` as const;
export const INTERNAL_BULK_GET_CASES_URL = `${CASES_INTERNAL_URL}/_bulk_get` as const;
export const INTERNAL_GET_CASE_USER_ACTIONS_STATS_URL =
  `${CASES_INTERNAL_URL}/{case_id}/user_actions/_stats` as const;
export const INTERNAL_CASE_USERS_URL = `${CASES_INTERNAL_URL}/{case_id}/_users` as const;

/**
 * Action routes
 */

export const ACTION_URL = '/api/actions' as const;
export const ACTION_TYPES_URL = `${ACTION_URL}/connector_types` as const;
export const CONNECTORS_URL = `${ACTION_URL}/connectors` as const;

/**
 * Alerts
 */
export const MAX_ALERTS_PER_CASE = 1000 as const;

/**
 * Searching
 */
export const MAX_DOCS_PER_PAGE = 10000 as const;
export const MAX_BULK_GET_ATTACHMENTS = MAX_DOCS_PER_PAGE;
export const MAX_CONCURRENT_SEARCHES = 10 as const;
export const MAX_BULK_GET_CASES = 1000 as const;

/**
 * Validation
 */

export const MAX_TITLE_LENGTH = 160 as const;

/**
 * Cases features
 */

export const DEFAULT_FEATURES: CasesFeaturesAllRequired = Object.freeze({
  alerts: { sync: true, enabled: true, isExperimental: false },
  metrics: [],
});

/**
 * Task manager
 */

export const CASES_TELEMETRY_TASK_NAME = 'cases-telemetry-task';

/**
 * Telemetry
 */
export const CASE_TELEMETRY_SAVED_OBJECT = 'cases-telemetry';
export const CASE_TELEMETRY_SAVED_OBJECT_ID = 'cases-telemetry';

/**
 * Cases UI Capabilities
 */
export const CREATE_CASES_CAPABILITY = 'create_cases' as const;
export const READ_CASES_CAPABILITY = 'read_cases' as const;
export const UPDATE_CASES_CAPABILITY = 'update_cases' as const;
export const DELETE_CASES_CAPABILITY = 'delete_cases' as const;
export const PUSH_CASES_CAPABILITY = 'push_cases' as const;

/**
 * Cases API Tags
 */

/**
 * This tag registered for the cases suggest user profiles API
 */
export const SUGGEST_USER_PROFILES_API_TAG = 'casesSuggestUserProfiles';

/**
 * This tag is registered for the security bulk get API
 */
export const BULK_GET_USER_PROFILES_API_TAG = 'bulkGetUserProfiles';

/**
 * User profiles
 */

export const DEFAULT_USER_SIZE = 10;
export const MAX_ASSIGNEES_PER_CASE = 10;
export const NO_ASSIGNEES_FILTERING_KEYWORD = 'none';

/**
 * Delays
 */
export const SEARCH_DEBOUNCE_MS = 500;

/**
 * Local storage keys
 */
export const LOCAL_STORAGE_KEYS = {
  casesQueryParams: 'cases.list.queryParams',
  casesFilterOptions: 'cases.list.filterOptions',
};
