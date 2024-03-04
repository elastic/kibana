/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// TODO: https://github.com/elastic/kibana/issues/110895
/* eslint-disable @kbn/eslint/no_export_all */

export * from './types';
export * from './alert_history_schema';
export * from './rewrite_request_case';
export * from './mustache_template';
export * from './validate_email_addresses';
export * from './connector_feature_config';
export * from './execution_log_types';

export const BASE_ACTION_API_PATH = '/api/actions';
export const INTERNAL_BASE_ACTION_API_PATH = '/internal/actions';
export const ACTIONS_FEATURE_ID = 'actions';

export const DEFAULT_MICROSOFT_EXCHANGE_URL = 'https://login.microsoftonline.com';
export const DEFAULT_MICROSOFT_GRAPH_API_URL = 'https://graph.microsoft.com/v1.0';
export const DEFAULT_MICROSOFT_GRAPH_API_SCOPE = 'https://graph.microsoft.com/.default';
