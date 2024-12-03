/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LicenseType } from '@kbn/licensing-plugin/common/types';

// Plugin information
export const PLUGIN_ID = 'integrationAssistant';

// Public App Routes
export const INTEGRATION_ASSISTANT_APP_ROUTE = '/app/integration_assistant';

// Server API Routes
export const INTEGRATION_ASSISTANT_BASE_PATH = '/api/integration_assistant';

export const ECS_GRAPH_PATH = `${INTEGRATION_ASSISTANT_BASE_PATH}/ecs`;
export const CATEGORIZATION_GRAPH_PATH = `${INTEGRATION_ASSISTANT_BASE_PATH}/categorization`;
export const ANALYZE_LOGS_PATH = `${INTEGRATION_ASSISTANT_BASE_PATH}/analyzelogs`;
export const RELATED_GRAPH_PATH = `${INTEGRATION_ASSISTANT_BASE_PATH}/related`;
export const CEL_INPUT_GRAPH_PATH = `${INTEGRATION_ASSISTANT_BASE_PATH}/cel`;
export const CHECK_PIPELINE_PATH = `${INTEGRATION_ASSISTANT_BASE_PATH}/pipeline`;
export const INTEGRATION_BUILDER_PATH = `${INTEGRATION_ASSISTANT_BASE_PATH}/build`;
export const FLEET_PACKAGES_PATH = `/api/fleet/epm/packages`;

// License
export const MINIMUM_LICENSE_TYPE: LicenseType = 'enterprise';

// ErrorCodes

export enum GenerationErrorCode {
  RECURSION_LIMIT = 'recursion-limit',
  RECURSION_LIMIT_ANALYZE_LOGS = 'recursion-limit-analyze-logs',
  UNSUPPORTED_LOG_SAMPLES_FORMAT = 'unsupported-log-samples-format',
  UNPARSEABLE_CSV_DATA = 'unparseable-csv-data',
  CEF_ERROR = 'cef-not-supported',
}

// Size limits
export const FRONTEND_SAMPLE_ROWS = 100;
export const LOG_FORMAT_DETECTION_SAMPLE_ROWS = 5;
export const CATEGORIZATION_INITIAL_BATCH_SIZE = 60;
export const CATEROGIZATION_REVIEW_BATCH_SIZE = 40;
export const CATEGORIZATION_REVIEW_MAX_CYCLES = 5;
export const CATEGORIZATION_RECURSION_LIMIT = 50;
