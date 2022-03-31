/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { ConnectorTypes } from './api';
import { CasesFeaturesAllRequired } from './ui/types';

export const DEFAULT_DATE_FORMAT = 'dateFormat' as const;
export const DEFAULT_DATE_FORMAT_TZ = 'dateFormat:tz' as const;

/**
 * Application
 */

export const APP_ID = 'cases' as const;
export const FEATURE_ID = 'generalCases' as const;
export const APP_OWNER = 'cases' as const;
export const APP_PATH = '/app/management/insightsAndAlerting/cases' as const;
/**
 * The main Cases application is in the stack management under the
 * Alerts and Insights section. To do that, Cases registers to the management
 * application. This constant holds the application ID of the management plugin
 */
export const STACK_APP_ID = 'management' as const;

/**
 * Saved objects
 */

export const CASE_SAVED_OBJECT = 'cases' as const;
export const CASE_CONNECTOR_MAPPINGS_SAVED_OBJECT = 'cases-connector-mappings' as const;
export const CASE_USER_ACTION_SAVED_OBJECT = 'cases-user-actions' as const;
export const CASE_COMMENT_SAVED_OBJECT = 'cases-comments' as const;
export const CASE_CONFIGURE_SAVED_OBJECT = 'cases-configure' as const;

/**
 * If more values are added here please also add them here: x-pack/test/cases_api_integration/common/fixtures/plugins
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
export const CASE_PUSH_URL = `${CASE_DETAILS_URL}/connector/{connector_id}/_push` as const;
export const CASE_REPORTERS_URL = `${CASES_URL}/reporters` as const;
export const CASE_STATUS_URL = `${CASES_URL}/status` as const;
export const CASE_TAGS_URL = `${CASES_URL}/tags` as const;
export const CASE_USER_ACTIONS_URL = `${CASE_DETAILS_URL}/user_actions` as const;

export const CASE_ALERTS_URL = `${CASES_URL}/alerts/{alert_id}` as const;
export const CASE_DETAILS_ALERTS_URL = `${CASE_DETAILS_URL}/alerts` as const;

export const CASE_METRICS_DETAILS_URL = `${CASES_URL}/metrics/{case_id}` as const;

/**
 * Internal routes
 */

export const CASES_INTERNAL_URL = '/internal/cases' as const;
export const INTERNAL_BULK_CREATE_ATTACHMENTS_URL =
  `${CASES_INTERNAL_URL}/attachments/_bulk_create` as const;

/**
 * Action routes
 */

export const ACTION_URL = '/api/actions' as const;
export const ACTION_TYPES_URL = `${ACTION_URL}/connector_types` as const;
export const CONNECTORS_URL = `${ACTION_URL}/connectors` as const;

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
export const MAX_ALERTS_PER_CASE = 5000 as const;

export const SECURITY_SOLUTION_OWNER = 'securitySolution' as const;
export const OBSERVABILITY_OWNER = 'observability' as const;

export const OWNER_INFO = {
  [SECURITY_SOLUTION_OWNER]: {
    label: 'Security',
    iconType: 'logoSecurity',
  },
  [OBSERVABILITY_OWNER]: {
    label: 'Observability',
    iconType: 'logoObservability',
  },
} as const;

export const MAX_DOCS_PER_PAGE = 10000 as const;
export const MAX_CONCURRENT_SEARCHES = 10 as const;

/**
 * Validation
 */

export const MAX_TITLE_LENGTH = 64 as const;

/**
 * Cases features
 */

export const DEFAULT_FEATURES: CasesFeaturesAllRequired = Object.freeze({
  alerts: { sync: true, enabled: true },
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
