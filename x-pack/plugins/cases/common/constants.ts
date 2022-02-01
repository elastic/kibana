/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { ConnectorTypes } from './api';
import { CasesContextFeatures } from './ui/types';

export const DEFAULT_DATE_FORMAT = 'dateFormat';
export const DEFAULT_DATE_FORMAT_TZ = 'dateFormat:tz';

export const APP_ID = 'cases';

export const CASE_SAVED_OBJECT = 'cases';
export const CASE_CONNECTOR_MAPPINGS_SAVED_OBJECT = 'cases-connector-mappings';
export const CASE_USER_ACTION_SAVED_OBJECT = 'cases-user-actions';
export const CASE_COMMENT_SAVED_OBJECT = 'cases-comments';
export const CASE_CONFIGURE_SAVED_OBJECT = 'cases-configure';

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

export const CASES_URL = '/api/cases';
export const CASE_DETAILS_URL = `${CASES_URL}/{case_id}`;
export const CASE_CONFIGURE_URL = `${CASES_URL}/configure`;
export const CASE_CONFIGURE_DETAILS_URL = `${CASES_URL}/configure/{configuration_id}`;
export const CASE_CONFIGURE_CONNECTORS_URL = `${CASE_CONFIGURE_URL}/connectors`;

export const CASE_COMMENTS_URL = `${CASE_DETAILS_URL}/comments`;
export const CASE_COMMENT_DETAILS_URL = `${CASE_DETAILS_URL}/comments/{comment_id}`;
export const CASE_PUSH_URL = `${CASE_DETAILS_URL}/connector/{connector_id}/_push`;
export const CASE_REPORTERS_URL = `${CASES_URL}/reporters`;
export const CASE_STATUS_URL = `${CASES_URL}/status`;
export const CASE_TAGS_URL = `${CASES_URL}/tags`;
export const CASE_USER_ACTIONS_URL = `${CASE_DETAILS_URL}/user_actions`;

export const CASE_ALERTS_URL = `${CASES_URL}/alerts/{alert_id}`;
export const CASE_DETAILS_ALERTS_URL = `${CASE_DETAILS_URL}/alerts`;

export const CASE_METRICS_DETAILS_URL = `${CASES_URL}/metrics/{case_id}`;

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
export const MAX_ALERTS_PER_CASE = 5000;

export const SECURITY_SOLUTION_OWNER = 'securitySolution';
export const OBSERVABILITY_OWNER = 'observability';

export const OWNER_INFO = {
  [SECURITY_SOLUTION_OWNER]: {
    label: 'Security',
    iconType: 'logoSecurity',
  },
  [OBSERVABILITY_OWNER]: {
    label: 'Observability',
    iconType: 'logoObservability',
  },
};

export const MAX_DOCS_PER_PAGE = 10000;
export const MAX_CONCURRENT_SEARCHES = 10;

/**
 * Validation
 */

export const MAX_TITLE_LENGTH = 64;

/**
 * Cases features
 */

export const DEFAULT_FEATURES: CasesContextFeatures = Object.freeze({
  alerts: { sync: true },
  metrics: [],
});
